-- GIFT64 (upsell) : la réduction ne s'applique qu'au 2e sac = le DERNIER article de p_items.
-- La page envoie toujours [sac 1, sac 2] (un seul article par couleur), donc le dernier = le sac de l'upsell.
-- Les autres codes (ex. BAG23) gardent exactement le comportement actuel (tous les articles liés au code).
-- À exécuter dans l'éditeur SQL de Supabase. place_order n'est pas modifiée : elle appelle apply_promo.

alter table public.promo_codes
  add column if not exists second_item_only boolean not null default false;

update public.promo_codes set second_item_only = true where code = 'GIFT64';

create or replace function public.apply_promo(p_code text, p_items jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_code     text := upper(trim(coalesce(p_code, '')));
  v_percent  integer;
  v_second   boolean;
  v_discount integer;
begin
  if v_code = '' or jsonb_typeof(p_items) <> 'array' then return null; end if;
  select percent, second_item_only into v_percent, v_second
  from public.promo_codes where code = v_code and active;
  if v_percent is null then return null; end if;

  if v_second then
    -- dernier article du tableau, 1 unité, arrondi inférieur (549 × 25 % = 137,25 → 137)
    select floor(pr.price * v_percent / 100.0)::integer into v_discount
    from (
      select t.i->>'slug' as slug
      from jsonb_array_elements(p_items) with ordinality as t(i, ord)
      where (t.i->>'qty')::int between 1 and 9
      order by t.ord desc
      limit 1
    ) q
    join public.products pr on pr.slug = q.slug and pr.active
    join public.promo_code_products pcp on pcp.code = v_code and pcp.product_slug = q.slug;
  else
    select coalesce(sum(floor(pr.price * q.qty * v_percent / 100.0)), 0)::integer into v_discount
    from (
      select i->>'slug' as slug, least(sum((i->>'qty')::int), 9) as qty
      from jsonb_array_elements(p_items) i
      where (i->>'qty')::int between 1 and 9
      group by 1
    ) q
    join public.products pr on pr.slug = q.slug and pr.active
    join public.promo_code_products pcp on pcp.code = v_code and pcp.product_slug = q.slug;
  end if;

  if coalesce(v_discount, 0) <= 0 then return null; end if;
  return jsonb_build_object('percent', v_percent, 'discount', v_discount);
end;
$function$;

-- Vérification (attendu : 137 / 137 / 137 / 274 pour BAG23 si lié aux deux produits) :
--   select apply_promo('GIFT64', '[{"slug":"zman-vert","qty":1}]');
--   select apply_promo('GIFT64', '[{"slug":"zman-rouge","qty":1},{"slug":"zman-vert","qty":1}]');

-- Correction des commandes GIFT64 déjà enregistrées avec la double réduction.
-- On ne touche que celles dont tous les articles ont le même prix (le 2e sac est alors sans ambiguïté).
-- Aperçu d'abord :
--   select o.order_number, o.discount, o.total, floor(min(oi.unit_price) * pc.percent / 100.0)::int as new_discount
--   from orders o join order_items oi on oi.order_id = o.id join promo_codes pc on pc.code = o.promo_code
--   where o.promo_code = 'GIFT64' group by o.id, pc.percent
--   having count(distinct oi.unit_price) = 1;
update public.orders o
set discount = x.new_discount,
    total    = o.subtotal - x.new_discount
from (
  select o2.id, floor(min(oi.unit_price) * pc.percent / 100.0)::int as new_discount
  from public.orders o2
  join public.order_items oi on oi.order_id = o2.id
  join public.promo_codes pc on pc.code = o2.promo_code
  where o2.promo_code = 'GIFT64'
  group by o2.id, pc.percent
  having count(distinct oi.unit_price) = 1
) x
where o.id = x.id and o.discount <> x.new_discount;
