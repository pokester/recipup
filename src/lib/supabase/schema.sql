/*
  POST-LAUNCH HARDENING (do not block deploy):

  1. Content-Security-Policy header — requires
     allowlisting Supabase, Google Fonts,
     Anthropic endpoints. Add after launch
     when endpoints are confirmed stable.

  2. Supabase type generation — run:
     npx supabase gen types typescript
       --project-id [project-id]
       > src/lib/supabase/database.types.ts
     Then replace manual type casts throughout.

  3. Rate limiting — add Upstash Redis or
     Vercel KV for per-user and per-IP
     rate limits on Claude API routes.

  4. Playwright E2E tests — add full user
     journey tests once app is stable in
     production.

  5. npm audit — run from a network
     environment with npm registry access
     and address any high/critical findings.

  6. Dynamic import Recharts — currently
     loaded eagerly on dog hub; lazy import
     chart panels for performance.
*/

-- ============================================================
-- RECIPUP DATABASE SCHEMA
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- Auto-populated from auth.users via trigger below
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email                   text,
  full_name               text,
  avatar_url              text,
  subscription_tier       text NOT NULL DEFAULT 'free'
                            CHECK (subscription_tier IN ('free', 'pack', 'pack_pro', 'founding')),
  subscription_expires_at timestamptz,
  trial_ends_at           timestamptz,
  market                  text NOT NULL DEFAULT 'uk'
                            CHECK (market IN ('uk', 'nl', 'us')),
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- dogs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dogs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name              text NOT NULL,
  breed             text,
  age_years         numeric,
  weight_kg         numeric,
  sex               text,
  activity_level    text,
  diet_type         text DEFAULT 'cooked',
  goal              text,
  health_conditions jsonb NOT NULL DEFAULT '[]',
  health_detail     jsonb NOT NULL DEFAULT '{}',
  allergens         jsonb NOT NULL DEFAULT '[]',
  other_exclusions  text,
  notes             text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- saved_recipes
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_recipes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id       uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  recipe_data  jsonb NOT NULL,
  is_favourite boolean NOT NULL DEFAULT false,
  generated_at timestamptz NOT NULL DEFAULT now(),
  saved_at     timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- recipe_generations
-- Used for free-tier monthly limit enforcement
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recipe_generations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id            uuid REFERENCES public.dogs(id) ON DELETE CASCADE,
  profile_snapshot  jsonb NOT NULL,
  recipes_generated int NOT NULL DEFAULT 3,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- health_logs
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.health_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id            uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  week_start        date NOT NULL,
  weight_kg         numeric,
  energy_level      text,
  coat_score        numeric,
  appetite          text,
  itching           numeric,
  joint_stiffness   numeric,
  digestion         text,
  vomiting          text,
  notes             text,
  recipe_adjustments jsonb NOT NULL DEFAULT '[]',
  response_message  text,
  vet_flag          boolean NOT NULL DEFAULT false,
  vet_message       text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(dog_id, week_start)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dogs             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_logs      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- dogs
CREATE POLICY "Users can read own dogs"
  ON public.dogs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dogs"
  ON public.dogs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dogs"
  ON public.dogs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dogs"
  ON public.dogs FOR DELETE
  USING (auth.uid() = user_id);

-- saved_recipes
CREATE POLICY "Users can read own saved recipes"
  ON public.saved_recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved recipes"
  ON public.saved_recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved recipes"
  ON public.saved_recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved recipes"
  ON public.saved_recipes FOR DELETE
  USING (auth.uid() = user_id);

-- recipe_generations
CREATE POLICY "Users can read own generations"
  ON public.recipe_generations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON public.recipe_generations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- health_logs
CREATE POLICY "Users can read own health logs"
  ON public.health_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health logs"
  ON public.health_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health logs"
  ON public.health_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, trial_ends_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    now() + interval '14 days'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- UPDATED_AT TRIGGER FOR DOGS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER dogs_updated_at
  BEFORE UPDATE ON public.dogs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE TRIGGER health_logs_updated_at
  BEFORE UPDATE ON public.health_logs
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ============================================================
-- USEFUL INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS dogs_user_id_idx
  ON public.dogs(user_id);

CREATE INDEX IF NOT EXISTS saved_recipes_user_id_idx
  ON public.saved_recipes(user_id);

CREATE INDEX IF NOT EXISTS saved_recipes_dog_id_idx
  ON public.saved_recipes(dog_id);

CREATE INDEX IF NOT EXISTS recipe_generations_user_month_idx
  ON public.recipe_generations(user_id, created_at);

CREATE INDEX IF NOT EXISTS health_logs_user_id_idx
  ON public.health_logs(user_id);

CREATE INDEX IF NOT EXISTS health_logs_dog_id_idx
  ON public.health_logs(dog_id);

CREATE INDEX IF NOT EXISTS health_logs_week_start_idx
  ON public.health_logs(week_start);

-- ============================================================
-- PANTRY ITEMS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pantry_items (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type           text NOT NULL CHECK (type IN ('ingredient', 'supplement', 'equipment')),
  name           text NOT NULL,
  quantity       numeric,
  unit           text,
  is_available   boolean NOT NULL DEFAULT true,
  is_running_low boolean NOT NULL DEFAULT false,
  affiliate_url  text,
  last_updated   timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pantry"
  ON public.pantry_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx
  ON public.pantry_items(user_id);

-- ============================================================
-- MEAL PLANNER
-- ============================================================

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  dog_id                    uuid REFERENCES public.dogs(id) ON DELETE CASCADE NOT NULL,
  plan_type                 text NOT NULL CHECK (plan_type IN ('weekly','monthly')),
  cooking_frequency         text NOT NULL CHECK (cooking_frequency IN ('daily','twice_weekly','once_weekly')),
  balance_type              text NOT NULL CHECK (balance_type IN ('per_meal','week_balanced')),
  budget_tier               text NOT NULL DEFAULT 'standard' CHECK (budget_tier IN ('budget','standard','premium')),
  start_date                date NOT NULL,
  end_date                  date NOT NULL,
  week_number               int DEFAULT 1,
  total_weeks               int DEFAULT 1,
  status                    text DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  estimated_weekly_cost_gbp numeric,
  estimated_weekly_cost_eur numeric,
  shopping_summary          jsonb,
  weekly_nutrition_avg      jsonb,
  created_at                timestamptz DEFAULT now(),
  updated_at                timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_plan_days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     uuid REFERENCES public.meal_plans(id) ON DELETE CASCADE NOT NULL,
  dog_id      uuid REFERENCES public.dogs(id) NOT NULL,
  day_date    date NOT NULL,
  day_number  int NOT NULL CHECK (day_number BETWEEN 1 AND 7),
  recipe_data jsonb NOT NULL,
  is_pinned   boolean DEFAULT false,
  source      text DEFAULT 'ai_generated' CHECK (source IN ('ai_generated','library','user_edited')),
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.meal_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own plans"
  ON public.meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own plan days"
  ON public.meal_plan_days FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM public.meal_plans WHERE user_id = auth.uid()
    )
  );

CREATE OR REPLACE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE INDEX IF NOT EXISTS meal_plans_user_id_idx     ON public.meal_plans(user_id);
CREATE INDEX IF NOT EXISTS meal_plans_dog_id_idx      ON public.meal_plans(dog_id);
CREATE INDEX IF NOT EXISTS meal_plan_days_plan_id_idx ON public.meal_plan_days(plan_id);
CREATE INDEX IF NOT EXISTS meal_plan_days_date_idx    ON public.meal_plan_days(day_date);

-- ============================================================
-- COST ESTIMATOR
-- ============================================================

-- Dogs: food spend columns (migration)
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS current_food_spend_monthly numeric;
ALTER TABLE public.dogs ADD COLUMN IF NOT EXISTS food_spend_currency text DEFAULT 'gbp';

-- Ingredient price catalogue
CREATE TABLE IF NOT EXISTS public.ingredient_prices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  name_normalized    text NOT NULL,
  type               text NOT NULL CHECK (type IN ('protein','carb','vegetable','supplement','oil','other')),
  market             text NOT NULL CHECK (market IN ('uk','nl')),
  price_per_kg       numeric,
  price_per_unit     numeric,
  unit               text DEFAULT 'kg',
  supermarket        text,
  product_url        text,
  awin_product_id    text,
  sync_frequency     text DEFAULT 'biweekly'
                       CHECK (sync_frequency IN ('daily','biweekly','weekly')),
  is_available       boolean DEFAULT true,
  needs_price_lookup boolean DEFAULT false,
  last_updated       timestamptz DEFAULT now(),
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE public.ingredient_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prices"
  ON public.ingredient_prices FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS ingredient_prices_normalized_market_idx
  ON public.ingredient_prices(name_normalized, market);
CREATE INDEX IF NOT EXISTS ingredient_prices_market_idx
  ON public.ingredient_prices(market);

-- Price sync audit log
CREATE TABLE IF NOT EXISTS public.price_sync_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market        text NOT NULL,
  sync_date     date NOT NULL,
  sync_type     text NOT NULL,
  items_updated int DEFAULT 0,
  items_added   int DEFAULT 0,
  items_failed  int DEFAULT 0,
  status        text DEFAULT 'success'
                  CHECK (status IN ('success','partial','failed')),
  error_message text,
  created_at    timestamptz DEFAULT now()
);

-- Recipe cost cache
CREATE TABLE IF NOT EXISTS public.recipe_costs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_hash      text NOT NULL,
  market           text NOT NULL,
  cost_per_day_gbp numeric,
  cost_per_day_eur numeric,
  cost_breakdown   jsonb,
  calculated_at    timestamptz DEFAULT now(),
  price_sync_date  date,
  UNIQUE(recipe_hash, market)
);

-- ============================================================
-- HEALTH HISTORY
-- ============================================================

CREATE TABLE IF NOT EXISTS public.health_logs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dog_id           uuid NOT NULL REFERENCES public.dogs(id) ON DELETE CASCADE,
  week_start       date NOT NULL,
  logged_at        timestamptz DEFAULT now(),

  -- Core metrics (always collected)
  weight_kg        numeric,
  energy_level     text CHECK (energy_level IN ('low','normal','high')),
  coat_score       int CHECK (coat_score BETWEEN 1 AND 5),
  appetite         text CHECK (appetite IN ('refusing','reduced','normal','enthusiastic')),

  -- Optional metrics (user expands)
  itching          text CHECK (itching IN ('none','occasional','frequent')),
  joint_stiffness  text CHECK (joint_stiffness IN ('none','mild','noticeable')),
  digestion        text CHECK (digestion IN ('great','variable','unsettled')),
  vomiting         text CHECK (vomiting IN ('none','once','more_than_once')),

  -- Free text
  notes            text,

  -- Analysis results
  recipe_adjustments jsonb DEFAULT '[]',
  response_message   text,
  vet_flag           boolean DEFAULT false,
  vet_message        text,

  UNIQUE (dog_id, week_start)
);

ALTER TABLE public.health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own health logs"
  ON public.health_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS health_logs_dog_id_idx
  ON public.health_logs(dog_id);

CREATE INDEX IF NOT EXISTS health_logs_user_dog_idx
  ON public.health_logs(user_id, dog_id, week_start DESC);

-- ============================================================
-- RLS FOR COST TABLES
-- Run this block in Supabase dashboard after updating schema
-- Note: (false) for insert blocks direct client writes;
-- the service role key bypasses RLS and can still write.
-- ============================================================

-- recipe_costs
ALTER TABLE public.recipe_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only writes costs"
  ON public.recipe_costs FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Anyone can read costs"
  ON public.recipe_costs FOR SELECT
  USING (true);

-- price_sync_log
ALTER TABLE public.price_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only writes sync log"
  ON public.price_sync_log FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Anyone can read sync log"
  ON public.price_sync_log FOR SELECT
  USING (true);

-- ingredient_prices (read-only for all, write via service role)
-- Note: ingredient_prices already has RLS enabled and a SELECT policy above.
-- The INSERT/UPDATE policy is intentionally omitted here — service role bypasses RLS.
