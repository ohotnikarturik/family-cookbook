# Local test identities (development only)

Used by [`supabase/seed.sql`](../../supabase/seed.sql) after `pnpm supabase:reset`. **Never use in staging or production.**

## Users

| User ID                                | Email                                | Display name  | Shared password   | Family(ies) | Role(s)                      |
| -------------------------------------- | ------------------------------------ | ------------- | ----------------- | ----------- | ---------------------------- |
| `11111111-1111-4111-8111-111111111101` | `owner-a@family-cookbook.test`       | Owner A       | `LocalDev-Only-1` | A           | `owner`                      |
| `11111111-1111-4111-8111-111111111102` | `editor-a@family-cookbook.test`      | Editor A      | `LocalDev-Only-1` | A           | `editor`                     |
| `11111111-1111-4111-8111-111111111103` | `viewer-a@family-cookbook.test`      | Viewer A      | `LocalDev-Only-1` | A           | `viewer`                     |
| `11111111-1111-4111-8111-111111111104` | `admin-a@family-cookbook.test`       | Admin A       | `LocalDev-Only-1` | A           | `admin`                      |
| `22222222-2222-4222-8222-222222222201` | `owner-b@family-cookbook.test`       | Owner B       | `LocalDev-Only-1` | B           | `owner`                      |
| `22222222-2222-4222-8222-222222222202` | `contributor-b@family-cookbook.test` | Contributor B | `LocalDev-Only-1` | B           | `contributor`                |
| `33333333-3333-4333-8333-333333333301` | `multi@family-cookbook.test`         | Multi Family  | `LocalDev-Only-1` | A + B       | `editor` in A, `viewer` in B |
| `44444444-4444-4444-8444-444444444401` | `owner-c@family-cookbook.test`       | Owner C       | `LocalDev-Only-1` | C           | `owner`                      |
| `44444444-4444-4444-8444-444444444402` | `viewer-c@family-cookbook.test`      | Viewer C      | `LocalDev-Only-1` | C           | `viewer`                     |

## Families

| Family | `families.id`                          | Name                  | Created by                                                 |
| ------ | -------------------------------------- | --------------------- | ---------------------------------------------------------- |
| A      | `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa` | Andersen Test Kitchen | Owner A                                                    |
| B      | `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb` | Berg Test Pantry      | Owner B                                                    |
| C      | `cccccccc-cccc-4ccc-8ccc-cccccccccccc` | Cole Empty Kitchen    | Owner C (no recipes, keep it empty: empty Home e2e, W38.5) |

## Membership rows

| `family_members.id`                    | Family | User          | Role          |
| -------------------------------------- | ------ | ------------- | ------------- |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0001` | A      | Owner A       | `owner`       |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0002` | A      | Admin A       | `admin`       |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0003` | A      | Editor A      | `editor`      |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0004` | A      | Viewer A      | `viewer`      |
| `aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaa0005` | A      | Multi Family  | `editor`      |
| `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0001` | B      | Owner B       | `owner`       |
| `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0002` | B      | Contributor B | `contributor` |
| `bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbb0003` | B      | Multi Family  | `viewer`      |
| `cccccccc-cccc-4ccc-8ccc-cccccccc0001` | C      | Owner C       | `owner`       |
| `cccccccc-cccc-4ccc-8ccc-cccccccc0002` | C      | Viewer C      | `viewer`      |

## Recipes (T2.4 browse fixtures)

Seeded from [`supabase/seed-recipes.sql`](../../supabase/seed-recipes.sql). Family A has **30 active** + **1 archived** recipe (pagination threshold 25).

| Recipe ID                                     | Family | Title                                                                             | Filters / notes                                                                                                                     |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0101`        | A      | Grandma's cardamom buns                                                           | `en`, Baking, tag `dessert`; translations `fi` (reviewed, complete) and `uk` (unreviewed, partial); no media (pgTAP 92 asset limit) |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0102`        | A      | Weeknight salmon soup                                                             | `en`, Soup, tags `fish` `quick`, ingredient salmon                                                                                  |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0103`        | A      | Archived beet salad                                                               | `en`, **archived**                                                                                                                  |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0104`        | A      | Український борщ                                                                  | `uk`, Soup; dish photo via `supabase:seed-photos`                                                                                   |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0105`        | A      | Сырники со сметаной                                                               | `ru`, Breakfast, tags `quick` `vegetarian`; dish photo                                                                              |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0106`        | A      | Karjalanpiirakat                                                                  | `fi`, Baking, tags `vegetarian` `holiday`; dish photo                                                                               |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0107`        | A      | Mustikkapiirakka                                                                  | `fi`, Dessert, tags `dessert` `vegetarian`; dish photo                                                                              |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0108`        | A      | Вареники з картоплею                                                              | `uk`, Main, tag `vegetarian`                                                                                                        |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0109`        | A      | Салат Оливье                                                                      | `ru`, Salad, tag `holiday`                                                                                                          |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0110`–`0131` | A      | 22 dishes in all four languages (title, description, timings; no ingredients yet) | pagination beyond 25                                                                                                                |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0201`        | B      | Contributor's pancakes                                                            | `en`, Contributor B                                                                                                                 |
| `eeeeeeee-eeee-4eee-8eee-eeeeeeee0202`        | B      | Owner B house bread                                                               | Baking                                                                                                                              |

Family A: 30 active + 1 archived, all created by Owner A. Family A tags: `dessert`, `fish`, `quick`, `vegetarian`, `holiday`.

UI steps: [`UI_TEST_T2_4.md`](./UI_TEST_T2_4.md) (browse), [`UI_TEST_T2_5.md`](./UI_TEST_T2_5.md) (editor).
