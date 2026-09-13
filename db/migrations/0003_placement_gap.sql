-- Gap ikut masuk rentang: dua karya tidak boleh saling menempel lebih dekat dari gap.
alter table placements drop column xr, drop column yr;
alter table placements
	add column xr int4range generated always as (int4range(x, x + w + gap)) stored,
	add column yr int4range generated always as (int4range(y, y + h + gap)) stored;
alter table placements add constraint placements_no_overlap exclude using gist (xr with &&, yr with &&);
