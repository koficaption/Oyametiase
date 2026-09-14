-- DEVELOPMENT SEED ONLY
-- Do not apply this file in production.
-- All sample people, money, and pastoral records are fictional demonstration data.

DO $$
DECLARE
  aid uuid;
  dept_men uuid;
  dept_women uuid;
  dept_youth uuid;
  dept_children uuid;
  dept_evangelism uuid;
  dept_choir uuid;
  dept_media uuid;
  dept_ushering uuid;
  dept_prayer uuid;
  dept_welfare uuid;
  dept_protocol uuid;
  svc_sunday uuid;
  svc_midweek uuid;
  svc_prayer uuid;
  pos_pe uuid;
  pos_sec uuid;
  pos_fin uuid;
  pos_dl uuid;
  m_elder uuid;
  m_secretary uuid;
  m_treasurer uuid;
  m_youth uuid;
  m_welfare uuid;
  m_member uuid;
  m_convert uuid;
  cat_tithe uuid;
  cat_sunday uuid;
  cat_midweek uuid;
  cat_thanks uuid;
  cat_donation uuid;
  cat_special uuid;
  cat_other_in uuid;
  cat_util uuid;
  cat_maint uuid;
  cat_welfare uuid;
  cat_prog uuid;
  cat_transport uuid;
  cat_equip uuid;
  cat_repair uuid;
  cat_other_ex uuid;
BEGIN
  SELECT id INTO aid FROM public.assemblies ORDER BY created_at LIMIT 1;

  INSERT INTO public.system_settings (key, value)
  VALUES ('development_seed', '{"applied": true, "warning": "Fictional development data. Do not use in production."}'::jsonb)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

  INSERT INTO public.positions (assembly_id, name, slug, description)
  VALUES
    (aid, 'Presiding Elder', 'presiding-elder', 'Highest local assembly officer'),
    (aid, 'Secretary', 'secretary', 'Assembly secretary'),
    (aid, 'Treasurer', 'treasurer', 'Finance officer'),
    (aid, 'Department Leader', 'department-leader', 'Leads a ministry'),
    (aid, 'Assistant Leader', 'assistant-leader', 'Assists a ministry leader'),
    (aid, 'Deacon', 'deacon', 'Serving deacon'),
    (aid, 'Deaconess', 'deaconess', 'Serving deaconess'),
    (aid, 'Evangelism worker', 'evangelism-worker', 'Evangelism ministry worker'),
    (aid, 'Usher', 'usher', 'Ushering team'),
    (aid, 'Choir member', 'choir-member', 'Choir'),
    (aid, 'Media worker', 'media-worker', 'Media team'),
    (aid, 'Children''s worker', 'childrens-worker', 'Children''s ministry'),
    (aid, 'Other', 'other', 'Other assembly worker')
  ON CONFLICT (assembly_id, slug) DO NOTHING;

  INSERT INTO public.departments (assembly_id, name, slug, description, meeting_day, meeting_time)
  VALUES
    (aid, 'Pentecost Men''s Ministry', 'pmm', 'Men''s ministry', 'Saturday', '16:00'),
    (aid, 'Pentecost Women''s Ministry', 'pwm', 'Women''s ministry', 'Sunday', '14:00'),
    (aid, 'Pentecost Youth Ministry', 'pym', 'Youth ministry', 'Friday', '18:00'),
    (aid, 'Children''s Ministry', 'children', 'Children''s ministry', 'Sunday', '08:00'),
    (aid, 'Evangelism', 'evangelism', 'Evangelism and outreach', 'Saturday', '07:00'),
    (aid, 'Choir', 'choir', 'Music ministry', 'Saturday', '16:00'),
    (aid, 'Media', 'media', 'Media and communications', 'Sunday', '07:00'),
    (aid, 'Ushering', 'ushering', 'Ushering team', 'Sunday', '07:30'),
    (aid, 'Prayer', 'prayer', 'Prayer ministry', 'Tuesday', '18:00'),
    (aid, 'Welfare', 'welfare', 'Member welfare', 'Sunday', '13:00'),
    (aid, 'Protocol', 'protocol', 'Protocol team', 'Sunday', '07:30')
  ON CONFLICT (assembly_id, slug) DO NOTHING;

  INSERT INTO public.services (assembly_id, name, slug, default_day, default_time)
  VALUES
    (aid, 'Sunday Worship Service', 'sunday-worship', 'Sunday', '08:00'),
    (aid, 'Midweek Service', 'midweek', 'Wednesday', '18:00'),
    (aid, 'Prayer Meeting', 'prayer-meeting', 'Tuesday', '18:00'),
    (aid, 'Youth Meeting', 'youth-meeting', 'Friday', '18:00'),
    (aid, 'Men''s Meeting', 'mens-meeting', 'Saturday', '16:00'),
    (aid, 'Women''s Meeting', 'womens-meeting', 'Sunday', '14:00'),
    (aid, 'Children''s Meeting', 'childrens-meeting', 'Sunday', '08:00'),
    (aid, 'Department Meeting', 'department-meeting', NULL, NULL),
    (aid, 'Evangelism Activity', 'evangelism-activity', 'Saturday', '07:00'),
    (aid, 'Special Program', 'special-program', NULL, NULL)
  ON CONFLICT (assembly_id, slug) DO NOTHING;

  INSERT INTO public.financial_categories (assembly_id, name, slug, type, is_system)
  VALUES
    (aid, 'Tithes', 'tithes', 'income', true),
    (aid, 'Sunday offerings', 'sunday-offerings', 'income', true),
    (aid, 'Midweek offerings', 'midweek-offerings', 'income', true),
    (aid, 'Thanksgiving', 'thanksgiving', 'income', true),
    (aid, 'Donations', 'donations', 'income', true),
    (aid, 'Special contributions', 'special-contributions', 'income', true),
    (aid, 'Other income', 'other-income', 'income', true),
    (aid, 'Utilities', 'utilities', 'expense', true),
    (aid, 'Maintenance', 'maintenance', 'expense', true),
    (aid, 'Welfare', 'welfare', 'expense', true),
    (aid, 'Church programs', 'church-programs', 'expense', true),
    (aid, 'Transport', 'transport', 'expense', true),
    (aid, 'Equipment', 'equipment', 'expense', true),
    (aid, 'Repairs', 'repairs', 'expense', true),
    (aid, 'Other expenses', 'other-expenses', 'expense', true)
  ON CONFLICT (assembly_id, slug) DO NOTHING;

  SELECT id INTO dept_men FROM public.departments WHERE slug = 'pmm' AND assembly_id = aid;
  SELECT id INTO dept_women FROM public.departments WHERE slug = 'pwm' AND assembly_id = aid;
  SELECT id INTO dept_youth FROM public.departments WHERE slug = 'pym' AND assembly_id = aid;
  SELECT id INTO dept_children FROM public.departments WHERE slug = 'children' AND assembly_id = aid;
  SELECT id INTO dept_evangelism FROM public.departments WHERE slug = 'evangelism' AND assembly_id = aid;
  SELECT id INTO dept_choir FROM public.departments WHERE slug = 'choir' AND assembly_id = aid;
  SELECT id INTO dept_media FROM public.departments WHERE slug = 'media' AND assembly_id = aid;
  SELECT id INTO dept_ushering FROM public.departments WHERE slug = 'ushering' AND assembly_id = aid;
  SELECT id INTO dept_prayer FROM public.departments WHERE slug = 'prayer' AND assembly_id = aid;
  SELECT id INTO dept_welfare FROM public.departments WHERE slug = 'welfare' AND assembly_id = aid;
  SELECT id INTO dept_protocol FROM public.departments WHERE slug = 'protocol' AND assembly_id = aid;
  SELECT id INTO svc_sunday FROM public.services WHERE slug = 'sunday-worship' AND assembly_id = aid;
  SELECT id INTO svc_midweek FROM public.services WHERE slug = 'midweek' AND assembly_id = aid;
  SELECT id INTO svc_prayer FROM public.services WHERE slug = 'prayer-meeting' AND assembly_id = aid;
  SELECT id INTO pos_pe FROM public.positions WHERE slug = 'presiding-elder' AND assembly_id = aid;
  SELECT id INTO pos_sec FROM public.positions WHERE slug = 'secretary' AND assembly_id = aid;
  SELECT id INTO pos_fin FROM public.positions WHERE slug = 'treasurer' AND assembly_id = aid;
  SELECT id INTO pos_dl FROM public.positions WHERE slug = 'department-leader' AND assembly_id = aid;
  SELECT id INTO cat_tithe FROM public.financial_categories WHERE slug = 'tithes' AND assembly_id = aid;
  SELECT id INTO cat_sunday FROM public.financial_categories WHERE slug = 'sunday-offerings' AND assembly_id = aid;
  SELECT id INTO cat_midweek FROM public.financial_categories WHERE slug = 'midweek-offerings' AND assembly_id = aid;
  SELECT id INTO cat_thanks FROM public.financial_categories WHERE slug = 'thanksgiving' AND assembly_id = aid;
  SELECT id INTO cat_donation FROM public.financial_categories WHERE slug = 'donations' AND assembly_id = aid;
  SELECT id INTO cat_special FROM public.financial_categories WHERE slug = 'special-contributions' AND assembly_id = aid;
  SELECT id INTO cat_other_in FROM public.financial_categories WHERE slug = 'other-income' AND assembly_id = aid;
  SELECT id INTO cat_util FROM public.financial_categories WHERE slug = 'utilities' AND assembly_id = aid;
  SELECT id INTO cat_maint FROM public.financial_categories WHERE slug = 'maintenance' AND assembly_id = aid;
  SELECT id INTO cat_welfare FROM public.financial_categories WHERE slug = 'welfare' AND assembly_id = aid;
  SELECT id INTO cat_prog FROM public.financial_categories WHERE slug = 'church-programs' AND assembly_id = aid;
  SELECT id INTO cat_transport FROM public.financial_categories WHERE slug = 'transport' AND assembly_id = aid;
  SELECT id INTO cat_equip FROM public.financial_categories WHERE slug = 'equipment' AND assembly_id = aid;
  SELECT id INTO cat_repair FROM public.financial_categories WHERE slug = 'repairs' AND assembly_id = aid;
  SELECT id INTO cat_other_ex FROM public.financial_categories WHERE slug = 'other-expenses' AND assembly_id = aid;

  INSERT INTO public.members (
    assembly_id, first_name, last_name, gender, membership_status,
    baptism_status, baptism_date, date_joined, primary_department_id
  ) VALUES
    (aid, 'Kwame', 'Mensah', 'male', 'active', 'baptized', '2008-06-12', '2005-01-09', dept_men),
    (aid, 'Abena', 'Owusu', 'female', 'active', 'baptized', '2012-04-08', '2010-03-14', dept_women),
    (aid, 'Yaw', 'Boateng', 'male', 'active', 'baptized', '2016-08-21', '2015-11-01', dept_men),
    (aid, 'Akosua', 'Asante', 'female', 'active', 'baptized', '2019-05-19', '2018-02-11', dept_youth),
    (aid, 'Kofi', 'Adjei', 'male', 'active', 'baptized', '2014-03-02', '2013-07-20', dept_welfare),
    (aid, 'Efua', 'Darko', 'female', 'active', 'baptized', '2021-09-12', '2020-01-05', dept_choir),
    (aid, 'Kojo', 'Amponsah', 'male', 'new_convert', 'not_baptized', NULL, current_date - 21, dept_youth),
    (aid, 'Ama', 'Sarpong', 'female', 'active', 'baptized', '2011-07-17', '2009-08-30', dept_children),
    (aid, 'Nana', 'Yeboah', 'male', 'inactive', 'baptized', '2006-05-14', '2004-02-01', dept_men),
    (aid, 'Adwoa', 'Frimpong', 'female', 'active', 'baptized', '2023-04-09', '2022-12-18', dept_prayer)
  ON CONFLICT DO NOTHING;

  SELECT id INTO m_elder FROM public.members WHERE first_name = 'Kwame' AND last_name = 'Mensah' AND assembly_id = aid;
  SELECT id INTO m_secretary FROM public.members WHERE first_name = 'Abena' AND last_name = 'Owusu' AND assembly_id = aid;
  SELECT id INTO m_treasurer FROM public.members WHERE first_name = 'Yaw' AND last_name = 'Boateng' AND assembly_id = aid;
  SELECT id INTO m_youth FROM public.members WHERE first_name = 'Akosua' AND last_name = 'Asante' AND assembly_id = aid;
  SELECT id INTO m_welfare FROM public.members WHERE first_name = 'Kofi' AND last_name = 'Adjei' AND assembly_id = aid;
  SELECT id INTO m_member FROM public.members WHERE first_name = 'Efua' AND last_name = 'Darko' AND assembly_id = aid;
  SELECT id INTO m_convert FROM public.members WHERE first_name = 'Kojo' AND last_name = 'Amponsah' AND assembly_id = aid;

  UPDATE public.member_confidential SET
    phone = '+233201000001',
    email = 'kwame.mensah.dev@example.com',
    residential_address = 'House 12, Onyame Tease (DEV DATA)',
    date_of_birth = '1974-03-11',
    occupation = 'Teacher',
    marital_status = 'married',
    emergency_contact_name = 'Ama Mensah',
    emergency_relationship = 'Spouse',
    emergency_phone = '+233201000011',
    notes = 'DEVELOPMENT DATA — Presiding Elder sample record'
  WHERE member_id = m_elder;

  UPDATE public.member_confidential SET
    phone = '+233201000002',
    email = 'abena.owusu.dev@example.com',
    residential_address = 'House 4, Onyame Tease (DEV DATA)',
    date_of_birth = '1982-09-22',
    occupation = 'Administrator',
    marital_status = 'married',
    emergency_contact_name = 'Kofi Owusu',
    emergency_relationship = 'Spouse',
    emergency_phone = '+233201000012',
    notes = 'DEVELOPMENT DATA — Secretary sample record'
  WHERE member_id = m_secretary;

  UPDATE public.member_confidential SET
    phone = '+233201000003',
    email = 'yaw.boateng.dev@example.com',
    residential_address = 'House 8, Onyame Tease (DEV DATA)',
    date_of_birth = '1986-01-18',
    occupation = 'Accountant',
    marital_status = 'married',
    notes = 'DEVELOPMENT DATA — Treasurer sample record'
  WHERE member_id = m_treasurer;

  UPDATE public.departments SET leader_id = (SELECT id FROM public.members WHERE first_name = 'Nana' AND last_name = 'Yeboah' AND assembly_id = aid) WHERE id = dept_men;
  UPDATE public.departments SET leader_id = (SELECT id FROM public.members WHERE first_name = 'Ama' AND last_name = 'Sarpong' AND assembly_id = aid) WHERE id = dept_children;
  UPDATE public.departments SET leader_id = m_youth WHERE id = dept_youth;
  UPDATE public.departments SET leader_id = m_welfare WHERE id = dept_welfare;
  UPDATE public.departments SET leader_id = m_member WHERE id = dept_choir;
  UPDATE public.departments SET leader_id = m_convert WHERE id IN (SELECT id FROM public.members WHERE first_name = 'Adwoa');

  INSERT INTO public.department_members (department_id, member_id, role_in_department)
  VALUES
    (dept_men, m_elder, 'Leader'),
    (dept_women, m_secretary, 'Leader'),
    (dept_men, m_treasurer, 'Member'),
    (dept_youth, m_youth, 'Leader'),
    (dept_welfare, m_welfare, 'Leader'),
    (dept_choir, m_member, 'Member'),
    (dept_youth, m_convert, 'Member'),
    (dept_children, (SELECT id FROM public.members WHERE first_name = 'Ama' AND assembly_id = aid), 'Leader'),
    (dept_prayer, (SELECT id FROM public.members WHERE first_name = 'Adwoa' AND assembly_id = aid), 'Member')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.workers (assembly_id, member_id, position_id, department_id, start_date, status, notes)
  VALUES
    (aid, m_elder, pos_pe, NULL, '2020-01-12', 'active', 'DEV DATA'),
    (aid, m_secretary, pos_sec, NULL, '2021-03-07', 'active', 'DEV DATA'),
    (aid, m_treasurer, pos_fin, NULL, '2022-06-19', 'active', 'DEV DATA'),
    (aid, m_youth, pos_dl, dept_youth, '2023-02-05', 'active', 'DEV DATA'),
    (aid, m_welfare, pos_dl, dept_welfare, '2022-11-13', 'active', 'DEV DATA');

  INSERT INTO public.visitors (
    assembly_id, full_name, phone, location, date_visited, service_id,
    how_heard, prayer_request, assigned_to, follow_up_status, notes
  ) VALUES
    (aid, 'Samuel Oppong (DEV)', '+233241000101', 'Nearby community', current_date - 14, svc_sunday, 'Invitation from a friend', 'Family health', m_youth, 'contacted', 'DEVELOPMENT DATA'),
    (aid, 'Grace Nkrumah (DEV)', '+233241000102', 'Market area', current_date - 7, svc_sunday, 'Evangelism outreach', NULL, m_secretary, 'follow_up_scheduled', 'DEVELOPMENT DATA'),
    (aid, 'Daniel Osei (DEV)', '+233241000103', 'Onyame Tease', current_date - 2, svc_midweek, 'Walk-in', 'Job search', m_youth, 'new', 'DEVELOPMENT DATA');

  INSERT INTO public.visitor_followups (visitor_id, follow_up_date, method, notes)
  SELECT id, date_visited + 2, 'phone', 'DEV DATA follow-up call'
  FROM public.visitors WHERE assembly_id = aid;

  INSERT INTO public.member_followups (
    assembly_id, member_id, follow_up_type, assigned_to, status, progress, notes, next_contact_on
  ) VALUES (
    aid, m_convert, 'new_convert', m_youth, 'in_progress', 'Visited once', 'DEVELOPMENT DATA — new convert follow-up', current_date + 3
  );

  INSERT INTO public.attendance (
    assembly_id, member_id, service_id, attendance_date, status, check_in_time
  )
  SELECT aid, m.id, svc_sunday, current_date - (n || ' days')::interval, 'present', now() - (n || ' days')::interval
  FROM public.members m
  CROSS JOIN generate_series(0, 21, 7) AS n
  WHERE m.assembly_id = aid AND m.membership_status IN ('active', 'new_convert');

  INSERT INTO public.events (
    assembly_id, title, description, starts_at, ends_at, venue, organizer_id, department_id, status
  ) VALUES
    (aid, 'Sunday Worship Service', 'Weekly assembly worship', date_trunc('week', now()) + interval '7 days' + interval '8 hours', date_trunc('week', now()) + interval '7 days' + interval '11 hours', 'Main auditorium', m_elder, NULL, 'scheduled'),
    (aid, 'Youth All-Night (DEV)', 'Youth prayer and teaching', now() + interval '10 days', now() + interval '10 days 6 hours', 'Youth hall', m_youth, dept_youth, 'scheduled'),
    (aid, 'Community Evangelism (DEV)', 'House-to-house outreach', now() - interval '14 days', now() - interval '14 days' + interval '3 hours', 'Onyame Tease community', m_elder, dept_evangelism, 'completed');

  INSERT INTO public.announcements (
    assembly_id, title, content, category, audience, published_at, author_id
  ) VALUES
    (aid, 'Welcome to the assembly system (DEV)', 'This announcement is development seed data for Onyame Tease Assembly.', 'information', 'everyone', now(), NULL),
    (aid, 'Youth meeting this Friday (DEV)', 'All youth are encouraged to attend.', 'reminder', 'youth', now(), NULL);

  INSERT INTO public.financial_transactions (
    assembly_id, occurred_on, type, category_id, amount, description, payment_method, reference
  ) VALUES
    (aid, current_date - 21, 'income', cat_tithe, 2450.00, 'DEV DATA tithes', 'mobile_money', 'DEV-TITHE-1'),
    (aid, current_date - 21, 'income', cat_sunday, 860.00, 'DEV DATA Sunday offering', 'cash', 'DEV-OFF-1'),
    (aid, current_date - 14, 'income', cat_tithe, 1980.00, 'DEV DATA tithes', 'bank', 'DEV-TITHE-2'),
    (aid, current_date - 14, 'income', cat_donation, 500.00, 'DEV DATA donation', 'mobile_money', 'DEV-DON-1'),
    (aid, current_date - 10, 'expense', cat_util, 320.00, 'DEV DATA electricity', 'mobile_money', 'DEV-UTIL-1'),
    (aid, current_date - 8, 'expense', cat_prog, 450.00, 'DEV DATA program support', 'cash', 'DEV-PROG-1'),
    (aid, current_date - 3, 'income', cat_midweek, 210.00, 'DEV DATA midweek offering', 'cash', 'DEV-OFF-2');

  INSERT INTO public.financial_transactions (
    assembly_id, occurred_on, type, category_id, amount, description, payment_method, reference, department_id
  ) VALUES
    (aid, current_date - 12, 'income', cat_thanks, 180.00, 'DEV DATA PWM thanksgiving', 'cash', 'DEV-PWM-1', dept_women),
    (aid, current_date - 9, 'expense', cat_prog, 70.00, 'DEV DATA PWM meeting snacks', 'cash', 'DEV-PWM-2', dept_women),
    (aid, current_date - 11, 'income', cat_special, 220.00, 'DEV DATA PMM contribution', 'mobile_money', 'DEV-PMM-1', dept_men),
    (aid, current_date - 6, 'income', cat_donation, 150.00, 'DEV DATA PYM offering', 'cash', 'DEV-PYM-1', dept_youth),
    (aid, current_date - 5, 'expense', cat_equip, 40.00, 'DEV DATA children materials', 'cash', 'DEV-CH-1', dept_children);

  INSERT INTO public.welfare_cases (
    assembly_id, member_id, category, description, assistance_requested,
    assistance_provided, amount, responsible_officer_id, status, notes
  ) VALUES (
    aid, m_member, 'medical', 'DEV DATA medical support request',
    'Help with clinic bill', 'Part payment approved', 300.00, m_welfare, 'approved',
    'DEVELOPMENT DATA — not a real welfare case'
  );

  INSERT INTO public.department_activities (department_id, title, description, activity_date)
  VALUES (dept_youth, 'Bible study (DEV)', 'Weekly youth Bible study', current_date - 4);

  INSERT INTO public.department_reports (assembly_id, department_id, title, content, period_start, period_end)
  VALUES (aid, dept_youth, 'August youth report (DEV)', 'Attendance was steady. Two new converts are in follow-up. DEVELOPMENT DATA.', date_trunc('month', current_date)::date, current_date);
END $$;
