import { listMyFamilies } from '@family-cookbook/application';
import type { AppSupabaseClient } from '@family-cookbook/data-access';
import type { CallToolResult } from '@modelcontextprotocol/server';

import type { McpActorContext } from '../context.js';
import { useCaseToToolResult } from './map-use-case.js';

export const mapFamilyTool = {
  async listMyFamilies(ctx: McpActorContext & { supabase: AppSupabaseClient }): Promise<CallToolResult> {
    const result = await listMyFamilies(ctx.supabase);
    return useCaseToToolResult(result, {
      ok: (value) => ({ families: value.families }),
    });
  },
};
