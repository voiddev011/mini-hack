# EventSync interface refinement

## Layout

The masthead is 62px on desktop (58px on mobile). The extra toolbar, large slogan, numbered section labels, decorative sidebar stamp, repeated footer and team placeholder are removed. Main titles use 30px, section titles 20px, body and controls 14px, and secondary details 12–13px. No declared font size is below 12px. Spacing and quiet surface colours group content; rules remain only where they help read rows or identify input controls.

## Palette

Warm neutral background #f4f3ee, warm-white panels #fffefb, slate text #26363c, secondary text #58645f, deep teal controls #286457. Venue A uses sage, B muted sand, C slate blue. Status labels always include text so colour is not the only signal. This palette is a design choice for a scheduling workspace, not a claim that research identifies one universally best set of colours.

## Contrast checks

- Body text: 11.28:1 (#26363c on #f4f3ee).
- Secondary text: 5.55:1 (#58645f on #f4f3ee).
- Panel secondary text: 6.12:1 (#58645f on #fffefb).
- Summary labels: 5.18:1 (#58645f on #eaece4).
- Button text: 6.88:1 (#ffffff on #286457).
- Selected navigation: 7.14:1 (#205345 on #e0eae2).
- Venue A: 6.76:1 (#254d3c on #c7dfd2).
- Venue B: 6.06:1 (#694b22 on #eddfc2).
- Venue C: 6.39:1 (#344f6a on #d4e1ed).
- Confirmed status: 6.4:1 (#2b5d41 on #e1eee5).
- Rejected status: 6.18:1 (#8a402a on #f8e8df).
- Cancelled status: 5.59:1 (#535f62 on #e9edeb).
- Alternative card copy: 5.22:1 (#58645f on #e6eee7).
- Available hall: 4.58:1 (#64735f on #f1f5ee).
- Placeholder: 5.06:1 (#64716b on #fffefb).
- Success message: 7.16:1 (#355840 on #edf4ed).
- Conflict message: 5.98:1 (#805129 on #fbf0e5).

All 17 selected text/background pairs exceed 4.5:1. This is a colour-pair calculation, not a full accessibility audit or browser layout verification.

## Research

- IBM Carbon colour guidance: coordinated background and surface layers. https://www.carbondesignsystem.com/building-blocks/foundations/color/guidelines
- Nielsen Norman Group visual hierarchy: limited colour use, consistent hierarchy and grouping through space before extra borders. https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- W3C contrast minimum: at least 4.5:1 for normal text. https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html

No browser or computer UI was controlled during this refinement, following the user preference.
