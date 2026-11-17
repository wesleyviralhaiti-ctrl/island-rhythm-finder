CREATE TABLE public.listeners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  plan text,
  premium_until timestamptz,
  is_lifetime boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.listeners TO service_role;
ALTER TABLE public.listeners ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id uuid NOT NULL REFERENCES public.listeners(id) ON DELETE CASCADE,
  plan text NOT NULL,
  amount numeric NOT NULL,
  region text NOT NULL,
  phone text NOT NULL,
  reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT ALL ON public.payment_requests TO service_role;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX payment_requests_listener_idx ON public.payment_requests(listener_id);
CREATE INDEX payment_requests_status_idx ON public.payment_requests(status, created_at DESC);