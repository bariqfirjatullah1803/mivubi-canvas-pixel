-- Isi awal: pengaturan pameran, 6 referensi pola (PRD Lampiran A), 2 template poster preset.
insert into settings (id, canvas_width_mm, canvas_height_mm, canvas_cell_mm, gap, palette)
values (1, 2400, 1200, 50, 4, '[
	{"id":"default-near-black","name":"Hitam gelap","hex":"#101418"},
	{"id":"default-dark-gray","name":"Abu-abu gelap","hex":"#343B40"},
	{"id":"default-mid-gray","name":"Abu-abu sedang","hex":"#737C80"},
	{"id":"default-bone-white","name":"Putih tulang","hex":"#E8ECE8"},
	{"id":"default-cyan","name":"Biru cyan","hex":"#2AA6B4"},
	{"id":"default-green","name":"Hijau","hex":"#397A20"},
	{"id":"default-brown","name":"Cokelat","hex":"#744126"},
	{"id":"default-tan","name":"Kuning-tan","hex":"#B78850"}
]'::jsonb)
on conflict (id) do nothing;

insert into templates (name, colors, rows, position)
select * from (values
	('Pohon', '{"g":"#548B35","b":"#80502E","y":"#DCA83B"}'::jsonb,
	 '["....g....","...ggg...","..ggggg..",".ggggggg.","....b....","....b....","..bbbbb..","yyyyyyyyy"]'::jsonb, 1),
	('Smiley', '{"y":"#EBB734","k":"#25332B"}'::jsonb,
	 '["..yyyyy..",".yyyyyyy.","yyyyyyyyy","yykyyykyy","yyyyyyyyy","ykyyyyyky","yykkkkkyy",".yyyyyyy.","..yyyyy.."]'::jsonb, 2),
	('Hati', '{"r":"#D84955"}'::jsonb,
	 '[".rr...rr.","rrrr.rrrr","rrrrrrrrr","rrrrrrrrr",".rrrrrrr.","..rrrrr..","...rrr....","....r...."]'::jsonb, 3),
	('Bintang', '{"y":"#EBB734"}'::jsonb,
	 '["....y....","....y....","...yyy...","yyyyyyyyy",".yyyyyyy.","..yyyyy..","..yyyyy..",".yyy.yyy.",".yy...yy."]'::jsonb, 4),
	('Rumah', '{"r":"#B4533C","y":"#E9C985","b":"#684731","c":"#56B8C5"}'::jsonb,
	 '["....r....","...rrr...","..rrrrr..",".rrrrrrr.","rrrrrrrrr",".yyyyyyy.",".yccybby.",".yccybby.",".yyyybby."]'::jsonb, 5),
	('Merah Putih', '{"r":"#CE343A","w":"#FFFDF3","b":"#684731"}'::jsonb,
	 '["brrrrrrrr","brrrrrrrr","brrrrrrrr","bwwwwwwww","bwwwwwwww","bwwwwwwww","b........","b........","b........"]'::jsonb, 6)
) as t(name, colors, rows, position)
where not exists (select 1 from templates);

insert into poster_templates (name, kind, preset_id, position)
select * from (values ('MIVUBI', 'preset', 'default', 1), ('Around The Block', 'preset', 'atb', 2)) as t(name, kind, preset_id, position)
where not exists (select 1 from poster_templates);
