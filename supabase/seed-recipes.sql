-- Recipe fixtures for local development, pgTAP and Playwright. Loaded after seed.sql.
-- IDs and counts are documented in docs/fixtures/TEST_IDENTITIES.md.
--
-- Invariants other tests rely on (keep them when editing):
-- * Family A has exactly 30 active recipes and 1 archived recipe, all created by Owner A
--   (search-recipes.integration.test.ts, pagination at 25).
-- * 0101 "Grandma's cardamom buns" is an English original with ingredient and step positions 1–2,
--   a reviewed `fi` and a partial unreviewed `uk` translation, and no media assets
--   (93_recipe_translation_upsert.sql, 92_recipe_assets_rls.sql asset limit, e2e).
-- * 0102 "Weeknight salmon soup" matches a search for "salmon"; 0103 "Archived beet salad" is
--   the only archived recipe and matches "beet" (e2e).
-- * Family B: 0201 "Contributor's pancakes" is the only recipe by Contributor B.
-- * Each recipe's text is written in its source_language. Categories and tags are family data
--   and stay in English here.
-- Dish photos are added afterwards by `pnpm supabase:seed-photos` through the real upload flow.

-- ---------------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------------
insert into public.family_tags (id, family_id, name, normalized_name, created_by)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0101', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'dessert', 'dessert', '11111111-1111-4111-8111-111111111101'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0102', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'fish', 'fish', '11111111-1111-4111-8111-111111111101'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0103', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'quick', 'quick', '11111111-1111-4111-8111-111111111101'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0104', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'vegetarian', 'vegetarian', '11111111-1111-4111-8111-111111111101'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0105', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'holiday', 'holiday', '11111111-1111-4111-8111-111111111101'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddd0201', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'breakfast', 'breakfast', '22222222-2222-4222-8222-222222222201');

-- ---------------------------------------------------------------------------
-- Family A — fully written recipes (0101–0109)
-- ---------------------------------------------------------------------------
insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  description,
  source_language,
  category,
  servings,
  prep_minutes,
  cook_minutes,
  notes,
  status,
  archived_at,
  created_at,
  updated_at
)
select
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v.n::text, 4, '0'))::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  v.title,
  v.description,
  v.lang,
  v.category,
  v.servings,
  v.prep,
  v.cook,
  v.notes,
  v.status::public.recipe_status,
  case when v.status = 'archived' then now() - interval '30 days' end,
  now() - v.age,
  now() - v.age
from
  (
    values
      (101, 'Grandma''s cardamom buns', 'Soft pulla-style buns with cardamom and pearl sugar.', 'en', 'Baking', 12, 45, 25, 'Best on the day they are baked. Freeze the rest and warm them for 5 minutes.', 'active', interval '2 days'),
      (102, 'Weeknight salmon soup', 'Light salmon and potato soup for busy evenings.', 'en', 'Soup', 4, 15, 30, null, 'active', interval '1 day'),
      (103, 'Archived beet salad', 'A retired family favourite kept for history.', 'en', 'Salad', 6, 20, null, null, 'archived', interval '90 days'),
      (104, 'Український борщ', 'Густий борщ на яловичому бульйоні, як у бабусі на неділю.', 'uk', 'Soup', 6, 30, 90, 'Найсмачніший на другий день. Подавайте зі сметаною та пампушками.', 'active', interval '3 hours'),
      (105, 'Сырники со сметаной', 'Нежные творожные сырники на завтрак — готовы за полчаса.', 'ru', 'Breakfast', 4, 10, 15, 'Творог берите сухой и жирный, тогда сырники не расплывутся.', 'active', interval '6 hours'),
      (106, 'Karjalanpiirakat', 'Perinteiset riisipiirakat munavoin kanssa.', 'fi', 'Baking', 16, 60, 15, 'Piirakat säilyvät pakastimessa hyvin.', 'active', interval '4 days'),
      (107, 'Mustikkapiirakka', 'Mehevä mustikkapiirakka kesämökin tapaan.', 'fi', 'Dessert', 8, 20, 30, null, 'active', interval '5 days'),
      (108, 'Вареники з картоплею', 'Вареники з картоплею та смаженою цибулею.', 'uk', 'Main', 6, 60, 10, null, 'active', interval '6 days'),
      (109, 'Салат Оливье', 'Праздничный салат, без которого не обходится Новый год.', 'ru', 'Salad', 8, 30, 30, null, 'active', interval '7 days')
  ) as v (n, title, description, lang, category, servings, prep, cook, notes, status, age);

-- ---------------------------------------------------------------------------
-- Family A — shorter entries (0110–0131): title, description and timings only,
-- like recipes a family has started but not fully typed up yet.
-- ---------------------------------------------------------------------------
insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  description,
  source_language,
  category,
  servings,
  prep_minutes,
  cook_minutes,
  status,
  created_at,
  updated_at
)
select
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v.n::text, 4, '0'))::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  '11111111-1111-4111-8111-111111111101'::uuid,
  v.title,
  v.description,
  v.lang,
  v.category,
  v.servings,
  v.prep,
  v.cook,
  'active',
  now() - ((v.n - 100) || ' days')::interval,
  now() - ((v.n - 100) || ' days')::interval
from
  (
    values
      (110, 'Apple crumble', 'Warm apple crumble with an oat topping.', 'en', 'Dessert', 6, 15, 40),
      (111, 'Lihapullat', 'Kotoisat lihapullat ja ruskea kastike.', 'fi', 'Main', 4, 20, 25),
      (112, 'Пельмени домашние', 'Пельмени с говядиной и свининой — лепим всей семьёй.', 'ru', 'Main', 6, 90, 10),
      (113, 'Голубці', 'Голубці з рисом і м''ясом у томатному соусі.', 'uk', 'Main', 6, 45, 60),
      (114, 'Tomato basil pasta', 'Quick pasta with tomatoes, garlic and basil.', 'en', 'Main', 4, 10, 15),
      (115, 'Hernekeitto', 'Torstain hernekeitto sinapin kanssa.', 'fi', 'Soup', 6, 15, 120),
      (116, 'Блины на молоке', 'Тонкие блины на молоке.', 'ru', 'Breakfast', 4, 10, 30),
      (117, 'Деруни', 'Хрусткі картопляні деруни зі сметаною.', 'uk', 'Main', 4, 20, 20),
      (118, 'Overnight oats', 'Oats soaked overnight with yogurt and berries.', 'en', 'Breakfast', 2, 5, null),
      (119, 'Kaalikääryleet', 'Uunissa haudutetut kaalikääryleet.', 'fi', 'Main', 6, 45, 90),
      (120, 'Гречка с грибами', 'Рассыпчатая гречка с лесными грибами и луком.', 'ru', 'Main', 4, 10, 25),
      (121, 'Узвар', 'Узвар із сухофруктів на Святвечір.', 'uk', 'Drink', 8, 10, 20),
      (122, 'Lemon drizzle cake', 'Moist lemon cake with a crunchy sugar glaze.', 'en', 'Baking', 10, 20, 45),
      (123, 'Lanttulaatikko', 'Joulupöydän lanttulaatikko.', 'fi', 'Side', 8, 20, 90),
      (124, 'Винегрет', 'Свекольный салат с квашеной капустой.', 'ru', 'Salad', 6, 30, null),
      (125, 'Пампушки з часником', 'Пухкі пампушки до борщу.', 'uk', 'Baking', 12, 90, 20),
      (126, 'Roast chicken with root vegetables', 'Sunday roast chicken with carrots and parsnips.', 'en', 'Main', 4, 20, 90),
      (127, 'Pannukakku', 'Uunipannukakku mansikkahillon kanssa.', 'fi', 'Dessert', 6, 10, 30),
      (128, 'Шарлотка', 'Яблочный пирог на скорую руку.', 'ru', 'Baking', 8, 15, 40),
      (129, 'Салат з редискою', 'Весняний салат з редискою та огірком.', 'uk', 'Salad', 4, 10, null),
      (130, 'Pea and mint soup', 'Bright green soup with peas and mint.', 'en', 'Soup', 4, 10, 20),
      (131, 'Ruisleipä', 'Hapanjuurinen ruisleipä.', 'fi', 'Baking', 12, 30, 60)
  ) as v (n, title, description, lang, category, servings, prep, cook);

-- ---------------------------------------------------------------------------
-- Family B
-- ---------------------------------------------------------------------------
insert into public.recipes (
  id,
  family_id,
  created_by,
  updated_by,
  title,
  description,
  source_language,
  category,
  servings,
  prep_minutes,
  cook_minutes,
  status,
  created_at,
  updated_at
)
values
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee0201', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222202', '22222222-2222-4222-8222-222222222202', 'Contributor''s pancakes', 'Fluffy weekend pancakes.', 'en', 'Breakfast', 4, 10, 15, 'active', now() - interval '3 hours', now() - interval '3 hours'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee0202', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222201', '22222222-2222-4222-8222-222222222201', 'Owner B house bread', 'Daily loaf with a crisp crust.', 'en', 'Baking', 8, 20, 40, 'active', now() - interval '5 hours', now() - interval '5 hours');

-- ---------------------------------------------------------------------------
-- Ingredients. Numbers go in `quantity` + `unit`; only non-numeric amounts use `quantity_text`.
-- Fixed IDs are kept where tests or older fixtures reference them.
-- ---------------------------------------------------------------------------
insert into public.recipe_ingredients (id, recipe_id, family_id, position, name, quantity, unit, quantity_text, notes)
select
  coalesce(v.id, gen_random_uuid()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v.n::text, 4, '0'))::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  v.position,
  v.name,
  v.quantity,
  v.unit,
  v.quantity_text,
  v.notes
from
  (
    values
      -- 0101 Grandma's cardamom buns (en)
      (101, 'cccccccc-cccc-4ccc-8ccc-cccccccc0101'::uuid, 1, 'All-purpose flour', 500::numeric, 'g', null, null),
      (101, 'cccccccc-cccc-4ccc-8ccc-cccccccc0102'::uuid, 2, 'Ground cardamom', 2, 'tsp', null, null),
      (101, null, 3, 'Milk', 250, 'ml', null, 'lukewarm'),
      (101, null, 4, 'Sugar', 100, 'g', null, null),
      (101, null, 5, 'Butter', 100, 'g', null, 'softened'),
      (101, null, 6, 'Fresh yeast', 25, 'g', null, null),
      (101, null, 7, 'Egg', 1, null, null, 'plus 1 for brushing'),
      (101, null, 8, 'Salt', null, null, 'a pinch', null),
      (101, null, 9, 'Pearl sugar', null, null, 'for topping', null),
      -- 0102 Weeknight salmon soup (en)
      (102, 'cccccccc-cccc-4ccc-8ccc-cccccccc0103'::uuid, 1, 'Salmon fillet', 400, 'g', null, 'skinless'),
      (102, null, 2, 'Potatoes', 500, 'g', null, 'peeled and diced'),
      (102, null, 3, 'Leek', 1, null, null, null),
      (102, null, 4, 'Carrot', 1, null, null, null),
      (102, null, 5, 'Water', 1, 'l', null, null),
      (102, null, 6, 'Cream', 200, 'ml', null, null),
      (102, null, 7, 'Fresh dill', null, null, 'a handful', null),
      (102, null, 8, 'Salt and pepper', null, null, 'to taste', null),
      -- 0103 Archived beet salad (en)
      (103, null, 1, 'Cooked beetroot', 4, null, null, null),
      (103, null, 2, 'Red onion', 0.5, null, null, null),
      (103, null, 3, 'Sunflower oil', 2, 'tbsp', null, null),
      -- 0104 Український борщ (uk)
      (104, null, 1, 'Яловичина на кістці', 600, 'г', null, null),
      (104, null, 2, 'Буряк', 2, null, null, 'середні'),
      (104, null, 3, 'Картопля', 4, null, null, null),
      (104, null, 4, 'Капуста білокачанна', 300, 'г', null, null),
      (104, null, 5, 'Морква', 1, null, null, null),
      (104, null, 6, 'Цибуля', 1, null, null, null),
      (104, null, 7, 'Томатна паста', 2, 'ст. л.', null, null),
      (104, null, 8, 'Часник', 3, 'зубчики', null, null),
      (104, null, 9, 'Сіль і перець', null, null, 'за смаком', null),
      (104, null, 10, 'Сметана', null, null, 'для подачі', null),
      -- 0105 Сырники со сметаной (ru)
      (105, null, 1, 'Творог', 500, 'г', null, 'жирность 5–9 %'),
      (105, null, 2, 'Яйцо', 1, null, null, null),
      (105, null, 3, 'Мука', 4, 'ст. л.', null, 'и ещё немного для обваливания'),
      (105, null, 4, 'Сахар', 2, 'ст. л.', null, null),
      (105, null, 5, 'Ванильный сахар', 1, 'ч. л.', null, null),
      (105, null, 6, 'Соль', null, null, 'щепотка', null),
      (105, null, 7, 'Подсолнечное масло', null, null, 'для жарки', null),
      (105, null, 8, 'Сметана', null, null, 'для подачи', null),
      -- 0106 Karjalanpiirakat (fi)
      (106, null, 1, 'Puuroriisi', 2, 'dl', null, null),
      (106, null, 2, 'Vesi', 2, 'dl', null, 'puuroon'),
      (106, null, 3, 'Maito', 1, 'l', null, null),
      (106, null, 4, 'Ruisjauho', 3, 'dl', null, null),
      (106, null, 5, 'Vehnäjauho', 1, 'dl', null, null),
      (106, null, 6, 'Vesi', 2, 'dl', null, 'kuoritaikinaan'),
      (106, null, 7, 'Suola', 2, 'tl', null, null),
      (106, null, 8, 'Voi', 100, 'g', null, 'munavoihin'),
      (106, null, 9, 'Kananmuna', 3, null, null, 'keitetty, munavoihin'),
      -- 0107 Mustikkapiirakka (fi)
      (107, null, 1, 'Voi', 100, 'g', null, null),
      (107, null, 2, 'Sokeri', 1, 'dl', null, null),
      (107, null, 3, 'Kananmuna', 1, null, null, null),
      (107, null, 4, 'Vehnäjauho', 2.5, 'dl', null, null),
      (107, null, 5, 'Leivinjauhe', 1, 'tl', null, null),
      (107, null, 6, 'Mustikat', 4, 'dl', null, 'tuoreet tai pakastetut'),
      (107, null, 7, 'Kermaviili', 200, 'g', null, null),
      (107, null, 8, 'Vaniljasokeri', 1, 'tl', null, null),
      -- 0108 Вареники з картоплею (uk)
      (108, null, 1, 'Борошно', 500, 'г', null, null),
      (108, null, 2, 'Вода', 250, 'мл', null, 'тепла'),
      (108, null, 3, 'Яйце', 1, null, null, null),
      (108, null, 4, 'Картопля', 1, 'кг', null, null),
      (108, null, 5, 'Цибуля', 2, null, null, null),
      (108, null, 6, 'Олія', 3, 'ст. л.', null, null),
      (108, null, 7, 'Сіль', null, null, 'за смаком', null),
      -- 0109 Салат Оливье (ru)
      (109, null, 1, 'Картофель', 4, null, null, null),
      (109, null, 2, 'Морковь', 2, null, null, null),
      (109, null, 3, 'Яйца', 4, null, null, null),
      (109, null, 4, 'Докторская колбаса', 300, 'г', null, null),
      (109, null, 5, 'Маринованные огурцы', 4, null, null, null),
      (109, null, 6, 'Зелёный горошек', 1, 'банка', null, null),
      (109, null, 7, 'Майонез', 200, 'г', null, null),
      (109, null, 8, 'Соль', null, null, 'по вкусу', null)
  ) as v (n, id, position, name, quantity, unit, quantity_text, notes);

-- ---------------------------------------------------------------------------
-- Steps
-- ---------------------------------------------------------------------------
insert into public.recipe_steps (id, recipe_id, family_id, position, instruction, duration_minutes)
select
  coalesce(v.id, gen_random_uuid()),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v.n::text, 4, '0'))::uuid,
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  v.position,
  v.instruction,
  v.minutes
from
  (
    values
      -- 0101
      (101, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0101'::uuid, 1, 'Warm the milk until lukewarm and dissolve the yeast in it.', null::integer),
      (101, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0102'::uuid, 2, 'Mix in the sugar, cardamom, salt, egg and flour. Knead in the butter until the dough is smooth.', 10),
      (101, null, 3, 'Cover and let the dough rise until doubled, about 45 minutes.', 45),
      (101, null, 4, 'Shape 12 buns, let them rise for 20 minutes, brush with egg and sprinkle with pearl sugar.', 20),
      (101, null, 5, 'Bake at 200 °C for 10–12 minutes until golden.', 12),
      -- 0102
      (102, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0103'::uuid, 1, 'Bring the water to a boil with the potatoes, carrot and leek. Simmer until tender.', 15),
      (102, null, 2, 'Add the salmon in pieces and simmer gently for 5 minutes.', 5),
      (102, null, 3, 'Stir in the cream, season and finish with chopped dill.', null),
      -- 0103
      (103, null, 1, 'Dice the beetroot and onion, mix with the oil and season.', null),
      -- 0104
      (104, null, 1, 'Залийте м''ясо 3 л холодної води, доведіть до кипіння, зніміть піну і варіть на малому вогні півтори години.', 90),
      (104, null, 2, 'Наріжте буряк соломкою і тушкуйте з томатною пастою 10 хвилин.', 10),
      (104, null, 3, 'Додайте в бульйон картоплю, а через 10 хвилин — капусту.', 20),
      (104, null, 4, 'Обсмажте цибулю з морквою і додайте до борщу разом із буряком.', 10),
      (104, null, 5, 'Додайте часник, посоліть, поперчіть і дайте борщу настоятися 15 хвилин.', 15),
      -- 0105
      (105, null, 1, 'Разомните творог вилкой, добавьте яйцо, сахар, ванильный сахар и соль.', null),
      (105, null, 2, 'Вмешайте муку. Тесто должно быть мягким, но держать форму.', null),
      (105, null, 3, 'Сформируйте 8 сырников и обваляйте их в муке.', null),
      (105, null, 4, 'Жарьте на среднем огне по 3–4 минуты с каждой стороны до золотистой корочки.', 8),
      (105, null, 5, 'Подавайте тёплыми со сметаной или вареньем.', null),
      -- 0106
      (106, null, 1, 'Keitä riisi vedessä, lisää maito ja haudu puuroksi noin 40 minuuttia. Mausta suolalla.', 40),
      (106, null, 2, 'Sekoita jauhot, vesi ja suola kuoritaikinaksi.', null),
      (106, null, 3, 'Kauli taikinasta ohuita ympyröitä, levitä puuro keskelle ja rypytä reunat.', null),
      (106, null, 4, 'Paista 275 asteessa noin 15 minuuttia ja voitele sulatetulla voilla.', 15),
      (106, null, 5, 'Sekoita hienonnetut munat ja pehmeä voi munavoiksi ja tarjoile piirakoiden kanssa.', null),
      -- 0107
      (107, null, 1, 'Vaahdota voi ja puolet sokerista. Lisää muna sekä jauhot ja leivinjauhe.', null),
      (107, null, 2, 'Painele taikina piirakkavuokaan ja levitä mustikat päälle.', null),
      (107, null, 3, 'Sekoita kermaviili, loput sokerista ja vaniljasokeri ja kaada mustikoiden päälle.', null),
      (107, null, 4, 'Paista 200 asteessa noin 30 minuuttia.', 30),
      -- 0108
      (108, null, 1, 'Замісіть тісто з борошна, води, яйця і солі, накрийте і залиште на 30 хвилин.', 30),
      (108, null, 2, 'Зваріть картоплю і розімніть у пюре.', 20),
      (108, null, 3, 'Обсмажте цибулю на олії, половину додайте до пюре.', 10),
      (108, null, 4, 'Розкачайте тісто, виріжте кружальця, покладіть начинку і защипніть краї.', null),
      (108, null, 5, 'Варіть у підсоленій воді 5 хвилин після того, як вареники спливуть. Подавайте з рештою цибулі.', 5),
      -- 0109
      (109, null, 1, 'Отварите картофель, морковь и яйца, остудите.', 30),
      (109, null, 2, 'Нарежьте всё мелким кубиком.', null),
      (109, null, 3, 'Добавьте горошек, заправьте майонезом и посолите.', null),
      (109, null, 4, 'Уберите салат в холодильник на час перед подачей.', 60)
  ) as v (n, id, position, instruction, minutes);

-- ---------------------------------------------------------------------------
-- Recipe tags
-- ---------------------------------------------------------------------------
insert into public.recipe_tags (recipe_id, family_id, tag_id)
select
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeee' || lpad(v.n::text, 4, '0'))::uuid,
  v.family_id::uuid,
  ('dddddddd-dddd-4ddd-8ddd-dddddddd' || lpad(v.tag::text, 4, '0'))::uuid
from
  (
    values
      (101, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 101),
      (102, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 102),
      (102, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 103),
      (105, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 103),
      (105, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 104),
      (106, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 104),
      (106, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 105),
      (107, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 101),
      (107, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 104),
      (108, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 104),
      (109, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 105),
      (110, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 101),
      (114, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 103),
      (114, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 104),
      (201, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 201)
  ) as v (n, family_id, tag);

-- ---------------------------------------------------------------------------
-- Translations of 0101: a complete reviewed Finnish version and a partial
-- unreviewed Ukrainian one (shows the "original shown for this line" fallback).
-- ---------------------------------------------------------------------------
insert into public.recipe_translations (
  recipe_id,
  family_id,
  language_tag,
  title,
  description,
  notes,
  created_by,
  review_status,
  reviewed_by,
  reviewed_at
)
values
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'fi',
    'Mummon kardemummapullat',
    'Pehmeät kardemummapullat raesokerilla.',
    'Parhaita paistopäivänä. Pakasta loput ja lämmitä 5 minuuttia.',
    '11111111-1111-4111-8111-111111111101',
    'reviewed',
    '11111111-1111-4111-8111-111111111101',
    now()
  ),
  (
    'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'uk',
    'Булочки бабусі з кардамоном',
    'М''які булочки з кардамоном.',
    null,
    '11111111-1111-4111-8111-111111111101',
    'unreviewed',
    null,
    null
  );

insert into public.recipe_ingredient_translations (ingredient_id, family_id, language_tag, name, notes)
select
  i.id,
  i.family_id,
  v.lang,
  v.name,
  v.notes
from
  (
    values
      ('fi', 1, 'Vehnäjauho', null),
      ('fi', 2, 'Jauhettu kardemumma', null),
      ('fi', 3, 'Maito', 'kädenlämpöinen'),
      ('fi', 4, 'Sokeri', null),
      ('fi', 5, 'Voi', 'pehmeä'),
      ('fi', 6, 'Tuorehiiva', null),
      ('fi', 7, 'Kananmuna', 'sekä 1 voiteluun'),
      ('fi', 8, 'Suola', null),
      ('fi', 9, 'Raesokeri', null),
      ('uk', 1, 'Пшеничне борошно', null)
  ) as v (lang, position, name, notes)
  join public.recipe_ingredients as i on i.recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid
  and i.position = v.position;

insert into public.recipe_step_translations (step_id, family_id, language_tag, instruction)
select
  s.id,
  s.family_id,
  v.lang,
  v.instruction
from
  (
    values
      ('fi', 1, 'Lämmitä maito kädenlämpöiseksi ja liuota hiiva siihen.'),
      ('fi', 2, 'Lisää sokeri, kardemumma, suola, muna ja jauhot. Vaivaa voi taikinaan, kunnes taikina on sileää.'),
      ('fi', 3, 'Peitä taikina ja anna kohota kaksinkertaiseksi, noin 45 minuuttia.'),
      ('fi', 4, 'Muotoile 12 pullaa, anna kohota 20 minuuttia, voitele munalla ja ripottele päälle raesokeria.'),
      ('fi', 5, 'Paista 200 asteessa 10–12 minuuttia, kunnes pullat ovat kullanruskeita.'),
      ('uk', 1, 'Підігрійте молоко до теплого і розчиніть у ньому дріжджі.')
  ) as v (lang, position, instruction)
  join public.recipe_steps as s on s.recipe_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeee0101'::uuid
  and s.position = v.position;
