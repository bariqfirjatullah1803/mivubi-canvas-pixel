import { handler, requireAdmin, str } from '$lib/server/api';
import { q } from '$lib/server/db';
import { COLS, toSummary, type Row } from '$lib/server/projects';

export const GET = handler(async (event) => {
	requireAdmin(event);
	const status = event.url.searchParams.get('status') ?? 'all';
	const needle = str(event.url.searchParams.get('q'), 100).toLowerCase();
	const rows = await q<Row & { owner_name: string | null }>(
		`select ${COLS.split(', ').map((c) => 'p.' + c).join(', ')}, u.username owner_name
		 from projects p left join users u on u.id = p.owner_user_id
		 where p.saved_at is not null and p.deleted_at is null
		   and (p.visibility = 'public' or p.taken_down_at is not null)
		   and ($1 = 'all' or ($1 = 'shown' and p.taken_down_at is null) or ($1 = 'hidden' and p.taken_down_at is not null))
		   and ($2 = '' or lower(coalesce(p.title, '')) like '%' || $2 || '%'
		        or lower(coalesce(p.creator_name, '')) like '%' || $2 || '%'
		        or lower(coalesce(p.social_handle, '')) like '%' || $2 || '%'
		        or lower(coalesce(u.username, '')) like '%' || $2 || '%')
		 order by p.updated_at desc`,
		[status, needle]
	);
	return rows.map((r) => ({ ...toSummary(r), ownerName: r.owner_name }));
});
