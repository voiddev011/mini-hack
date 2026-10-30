import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured } from "../config/supabase";
import { useAuth } from "./useAuth";
import { useCorporateIntelligence } from "./useCorporateIntelligence";
import { alertEventKey, evaluateAlertRules } from "../analysis/alertRules";
import {
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  listAlertRules,
  listAlertEvents,
  insertAlertEvent,
} from "../services/alertService";

export function useCompanyAlerts(analysis) {
  const { user } = useAuth();
  const {
    sessionAlertRules,
    setSessionAlertRules,
    sessionAlertEvents,
    setSessionAlertEvents,
  } = useCorporateIntelligence();
  const company = analysis.company.trim().toLowerCase().replace(/\s+/g, " ");
  const persistent = Boolean(user && isSupabaseConfigured);
  const key = JSON.stringify([persistent ? user.id : "session", company]);
  const [stored, setStored] = useState({
    key: "",
    ready: false,
    rules: [],
    events: [],
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const pending = useRef(new Set());
  const [operation, setOperation] = useState({
    key: "",
    busy: false,
    error: "",
  });

  useEffect(() => {
    if (!persistent) return undefined;
    let active = true;
    setStored({ key, ready: false, rules: [], events: [], error: "" });
    Promise.all([
      listAlertRules(user.id, company),
      listAlertEvents(user.id, company),
    ])
      .then(([rules, events]) => {
        if (active)
          setStored({
            key,
            ready: true,
            rules: rules.map((rule) => ({
              ...rule,
              threshold: Number(rule.threshold),
            })),
            events,
          });
      })
      .catch((error) => {
        if (active)
          setStored({
            key,
            ready: false,
            rules: [],
            events: [],
            error: error.message,
          });
      });
    return () => {
      active = false;
    };
  }, [persistent, user?.id, company, key, revision]);

  const ready = !persistent || (stored.key === key && stored.ready);
  const rules = useMemo(
    () =>
      persistent
        ? stored.key === key
          ? stored.rules
          : []
        : sessionAlertRules.filter((rule) => rule.company === company),
    [persistent, stored, key, sessionAlertRules, company],
  );
  const events = useMemo(
    () =>
      persistent
        ? stored.key === key
          ? stored.events
          : []
        : sessionAlertEvents.filter((event) => event.company === company),
    [persistent, stored, key, sessionAlertEvents, company],
  );
  const triggered = useMemo(
    () => (ready ? evaluateAlertRules(rules, analysis) : []),
    [ready, rules, analysis],
  );

  useEffect(() => {
    if (!ready) return;
    const existing = new Set(events.map(alertEventKey));
    const fresh = triggered.filter(
      (event) => !existing.has(alertEventKey(event)),
    );
    if (!fresh.length) return;
    if (!persistent) {
      setSessionAlertEvents((current) => {
        const seen = new Set(current.map(alertEventKey));
        return [
          ...fresh
            .filter((event) => !seen.has(alertEventKey(event)))
            .map((event) => ({
              ...event,
              id: crypto.randomUUID(),
              triggered_at: new Date().toISOString(),
            })),
          ...current,
        ];
      });
      return;
    }
    const unsaved = fresh.filter(
      (event) => !pending.current.has(`${key}:${alertEventKey(event)}`),
    );
    if (!unsaved.length) return;
    unsaved.forEach((event) =>
      pending.current.add(`${key}:${alertEventKey(event)}`),
    );
    Promise.all(unsaved.map((event) => insertAlertEvent(user.id, event)))
      .then(() => listAlertEvents(user.id, company))
      .then((saved) =>
        setStored((current) =>
          current.key === key ? { ...current, events: saved } : current,
        ),
      )
      .catch((error) =>
        setStored((current) =>
          current.key === key
            ? {
                ...current,
                error: `Alert history was not saved: ${error.message}`,
              }
            : current,
        ),
      )
      .finally(() =>
        unsaved.forEach((event) =>
          pending.current.delete(`${key}:${alertEventKey(event)}`),
        ),
      );
  }, [
    ready,
    triggered,
    events,
    persistent,
    user?.id,
    company,
    key,
    setSessionAlertEvents,
  ]);

  const mutate = async (kind, rule) => {
    if (!ready)
      throw new Error("Alert rules have not loaded. Retry before editing.");
    setOperation({ key, busy: true, error: "" });
    try {
      if (persistent) {
        if (kind === "create")
          await createAlertRule(user.id, { ...rule, company });
        if (kind === "update") await updateAlertRule(user.id, rule.id, rule);
        if (kind === "delete") await deleteAlertRule(user.id, rule.id);
        const [savedRules, savedEvents] = await Promise.all([
          listAlertRules(user.id, company),
          listAlertEvents(user.id, company),
        ]);
        setStored((current) =>
          current.key === key
            ? {
                ...current,
                rules: savedRules.map((row) => ({
                  ...row,
                  threshold: Number(row.threshold),
                })),
                events: savedEvents,
                error: "",
              }
            : current,
        );
      } else {
        if (kind === "create")
          setSessionAlertRules((current) => [
            ...current,
            { ...rule, company, id: crypto.randomUUID() },
          ]);
        if (kind === "update")
          setSessionAlertRules((current) =>
            current.map((row) =>
              row.id === rule.id ? { ...row, ...rule, company } : row,
            ),
          );
        if (kind === "delete") {
          setSessionAlertRules((current) =>
            current.filter((row) => row.id !== rule.id),
          );
          setSessionAlertEvents((current) =>
            current.filter((event) => event.rule_id !== rule.id),
          );
        }
      }
      setOperation({ key, busy: false, error: "" });
    } catch (error) {
      setOperation({ key, busy: false, error: error.message });
      throw error;
    }
  };
  return {
    rules,
    events,
    triggered,
    persistent,
    ready,
    busy: operation.key === key && operation.busy,
    error:
      (stored.key === key && stored.error) ||
      (operation.key === key && operation.error),
    create: (rule) => mutate("create", rule),
    update: (rule) => mutate("update", rule),
    remove: (rule) => mutate("delete", rule),
    retry: () => setRevision((current) => current + 1),
  };
}
