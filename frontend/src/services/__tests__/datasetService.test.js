import { describe, it, expect, vi, beforeEach } from 'vitest';
const { getClient } = vi.hoisted(() => ({ getClient: vi.fn() }));
vi.mock('../../config/supabase', () => ({ getSupabaseClient: getClient }));
import { uploadDataset, parseDatasetMetadata } from '../datasetService';
beforeEach(() => vi.clearAllMocks());
describe('private dataset submission', () => {
  it('rejects non CSV files before making backend calls', async () => {
    await expect(uploadDataset({ file: { name: 'report.pdf' } })).rejects.toThrow('CSV'); expect(getClient).not.toHaveBeenCalled();
  });
  it('removes the uploaded object when database insertion fails', async () => {
    const remove = vi.fn(async () => ({ error: null })); const upload = vi.fn(async () => ({ error: null }));
    getClient.mockReturnValue({ storage: { from: () => ({ upload, remove }) }, from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ error: new Error('Insert failed') }) }) }) }) });
    await expect(uploadDataset({ userId: 'owner', file: { name: 'sample.csv' }, datasetName: 'Sample' })).rejects.toThrow('Insert failed');
    expect(remove).toHaveBeenCalledOnce(); expect(remove.mock.calls[0][0][0]).toMatch(/^owner\/.+\.csv$/);
  });
  it('reports both failures if rollback also fails', async () => {
    getClient.mockReturnValue({ storage: { from: () => ({ upload: async () => ({}), remove: async () => ({ error: new Error('Cleanup failed') }) }) }, from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ error: new Error('Insert failed') }) }) }) }) });
    await expect(uploadDataset({ userId: 'owner', file: { name: 'sample.csv' }, datasetName: 'Sample' })).rejects.toBeInstanceOf(AggregateError);
  });
  it('handles legacy and null metadata safely', () => {
    expect(parseDatasetMetadata('null')).toEqual({ description: 'null' });
    expect(parseDatasetMetadata('plain text')).toEqual({ description: 'plain text' });
    expect(parseDatasetMetadata('{"version":1,"metadata":{"yearRange":"2024"}}')).toEqual({ yearRange: '2024' });
  });
});
