-- `[^/]+` y no un `like 'uid/%'`: sin eso, `uid/../otro/x.png` pasa el check.
drop policy profiles_update on public.profiles;

create policy profiles_update on public.profiles
for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and (
    avatar_path is null
    or avatar_path ~ ('^' || id::text || '/[^/]+$')
  )
);
