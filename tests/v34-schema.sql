create role anon; create role authenticated; create role service_role; create schema auth; create schema private;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
grant usage on schema public,auth,private to authenticated;
set check_function_bodies=false;
create table public.organisations("id" uuid default gen_random_uuid() not null,"organisation_name" text not null,"short_name" text,"billing_name" text,"billing_address_1" text,"billing_address_2" text,"town_city" text,"county_region" text,"postcode" text,"country" text default 'United Kingdom'::text,"billing_email" text,"sponsor" bool default false not null,"active" bool default true not null,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"website_url" text,"logo_path" text,"purchase_order_required" bool default false not null,"purchase_order_instructions" text);
create table public.attendees("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"serial_number" text,"jotform_submission_id" text,"invitation_id" uuid,"organisation_id" uuid,"billing_account_organisation_id" uuid,"linked_main_attendee_id" uuid,"invitation_status" text,"attendance_status" text default 'expected'::text not null,"category" text not null,"display_company" text,"title_rank" text,"first_name" text not null,"surname" text not null,"known_as" text,"post_nominals" text,"email" text,"mobile" text,"service" text,"discipline" text,"position_role" text,"dietary_requirements" text,"date_of_birth" date,"equipment_hire_required" bool,"boot_size" text,"attendee_notes" text,"protocol_notes" text,"data_checked" bool default false not null,"checked_by" uuid,"checked_at" timestamptz,"exception_flag" bool default false not null,"exception_reason" text,"source_last_updated_at" timestamptz,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"participation_status" text default 'participant'::text not null,"consolidated_invoice_included" bool default true not null,"record_source" text default 'registration'::text not null,"source_created_by" uuid);
create table public.accommodation_locations("id" uuid default gen_random_uuid() not null,"name" text not null,"location_type" text default 'hotel'::text not null,"active" bool default true not null,"notes" text);
create table public.room_types("id" uuid default gen_random_uuid() not null,"location_id" uuid,"name" text not null,"occupancy_class" text,"meal_basis" text,"active" bool default true not null,"notes" text);
create table public.stay_charge_periods("id" uuid default gen_random_uuid() not null,"attendee_id" uuid not null,"location_id" uuid,"room_type_id" uuid,"sharing_with_attendee_id" uuid,"requested_location" text,"actual_check_in" date,"actual_check_out" date,"billing_from" date,"billing_to" date,"package_type" text,"charge_segment_type" text default 'accommodation'::text not null,"rate_code" text,"billable_nights" int4,"unit_rate" numeric,"accommodation_charge" numeric,"approved_exception" bool default false not null,"exception_approved_by" uuid,"exception_notes" text,"protocol_confirmed" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"requested_check_in" date,"requested_check_out" date,"requested_room_share" bool,"requested_share_with" text,"requested_dinners" bool);
create table public.lift_passes("id" uuid default gen_random_uuid() not null,"attendee_id" uuid not null,"required" bool default false not null,"pass_type" text default '3V'::text,"start_date" date,"end_date" date,"carre_neige_required" bool default true not null,"chargeable" bool default true not null,"rate_code" text,"unit_rate" numeric,"pass_days" int4,"total_charge" numeric,"protocol_confirmed" bool default false not null,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.rate_card("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"rate_code" text not null,"charge_category" text not null,"location_id" uuid,"room_type_id" uuid,"description" text not null,"unit" text not null,"unit_price" numeric not null,"vat_rate" numeric,"tax_treatment" text,"status" text default 'proposed'::text not null,"effective_from" date,"effective_to" date,"active" bool default true not null,"source_note" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"paired_rate_code" text,"board_basis" text,"includes_dinner" bool default false not null,"confirmed_by" uuid,"confirmed_at" timestamptz);
create table public.invoice_lines("id" uuid default gen_random_uuid() not null,"invoice_id" uuid not null,"attendee_id" uuid,"source_type" text not null,"source_id" uuid,"description" text not null,"quantity" numeric default 1 not null,"unit_price" numeric default 0 not null,"net_amount" numeric default 0 not null,"vat_rate" numeric,"vat_amount" numeric default 0 not null,"gross_amount" numeric default 0 not null,"rate_code" text,"created_at" timestamptz default now() not null);
create table public.invoice_adjustments("id" uuid default gen_random_uuid() not null,"invoice_id" uuid,"attendee_id" uuid,"adjustment_type" text not null,"direction" text not null,"description" text not null,"value" numeric not null,"approved" bool default false not null,"approved_by" uuid,"approved_at" timestamptz,"notes" text,"created_at" timestamptz default now() not null);
create table public.payments("id" uuid default gen_random_uuid() not null,"invoice_id" uuid not null,"payment_method" text,"provider_reference" text,"amount" numeric not null,"paid_at" timestamptz,"notes" text,"created_at" timestamptz default now() not null);
create table public.venues("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"name" text not null,"venue_type" text,"address" text,"latitude" numeric,"longitude" numeric,"directions_text" text,"map_url" text,"active" bool default true not null,"notes" text,"piste_sector" text,"map_reference" text,"published" bool default false not null,"sort_order" int4 default 0 not null,"updated_at" timestamptz default now() not null);
create table public.invoices("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"attendee_id" uuid,"billing_account_organisation_id" uuid,"invoice_type" text not null,"invoice_reference" text not null,"issue_date" date,"due_date" date,"status" text default 'draft'::text not null,"payment_link" text,"net_total" numeric default 0 not null,"vat_total" numeric default 0 not null,"gross_total" numeric default 0 not null,"pdf_path" text,"sent_at" timestamptz,"paid_at" timestamptz,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"purchase_order_reference" text,"payment_terms_days" int4,"billing_address_exception_approved" bool default false not null,"billing_address_exception_reason" text,"billing_address_exception_approved_at" timestamptz,"billing_address_exception_approved_by" uuid,"approved_by" uuid,"approved_at" timestamptz,"issued_by" uuid,"issued_at" timestamptz,"paid_by" uuid,"payment_reference" text,"issuer_name_snapshot" text,"issuer_address_snapshot" text,"issuer_legal_details_snapshot" text,"payment_instructions_snapshot" text,"invoice_footer_snapshot" text,"recipient_name_snapshot" text,"recipient_email_snapshot" text,"recipient_address_snapshot" text,"event_name_snapshot" text,"event_start_date_snapshot" date,"event_end_date_snapshot" date,"pdf_generated_at" timestamptz,"pdf_sha256" text);
create table public.profiles("id" uuid not null,"attendee_id" uuid,"display_name" text,"app_role" text default 'attendee'::text not null,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"email" text);
create table public.sponsor_contacts("id" uuid default gen_random_uuid() not null,"organisation_id" uuid not null,"event_id" uuid,"first_name" text not null,"surname" text not null,"job_title" text,"email" text,"mobile" text,"primary_contact" bool default false not null,"billing_contact" bool default false not null,"active" bool default true not null,"notes" text,"created_at" timestamptz default now() not null);
create table public.audit_log("id" bigserial not null,"table_name" text not null,"record_id" uuid,"action" text not null,"actor_id" uuid,"changed_at" timestamptz default now() not null,"before_data" jsonb,"after_data" jsonb);
create table public.event_sponsors("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"organisation_id" uuid not null,"sponsor_status" text default 'invited'::text not null,"room_allocation" int4,"race_funding_sponsor" bool default false not null,"consolidated_invoice_requested" bool default false not null,"package_notes" text,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"sponsor_tier" text,"display_in_event_app" bool default true not null,"protocol_rep_allowance" int4,"sponsor_manager_notes" text);
create table public.jotform_field_mappings("id" uuid default gen_random_uuid() not null,"form_id" text not null,"source_key" text not null,"semantic_field" text not null,"target_entity" text not null,"target_field" text not null,"transform_rule" text,"active" bool default true not null,"notes" text);
create table public.integration_settings("integration_name" text not null,"secret_sha256" text not null,"active" bool default true not null,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.jotform_webhook_events("id" uuid default gen_random_uuid() not null,"form_id" text,"submission_id" text,"received_at" timestamptz default now() not null,"processed_at" timestamptz,"processing_status" text default 'received'::text not null,"payload" jsonb not null,"raw_request" jsonb,"error_message" text,"attendee_id" uuid);
create table public.booking_requests("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"invitation_id" uuid,"user_id" uuid,"attendee_id" uuid,"status" text default 'draft'::text not null,"submitted_at" timestamptz,"reviewed_at" timestamptz,"reviewed_by" uuid,"review_notes" text,"category" text,"title_rank" text,"first_name" text not null,"surname" text not null,"post_nominals" text,"email" text not null,"mobile" text,"service" text,"discipline" text,"position_role" text,"dietary_requirements" text,"date_of_birth" date,"other_information" text,"accommodation_required" bool,"accommodation_from" date,"accommodation_to" date,"hotel_preference" text,"room_share_requested" bool,"room_share_with" text,"room_sharing_option" text,"dinners_with_guests" bool,"arrival_method" text,"arrival_airport_station" text,"arrival_flight_number" text,"arrival_datetime" timestamptz,"arrival_resort_datetime" timestamptz,"arrival_transfer_requested" bool,"arrival_special_transfer_datetime" timestamptz,"departure_method" text,"departure_airport_station" text,"departure_flight_number" text,"departure_datetime" timestamptz,"departure_resort_datetime" timestamptz,"departure_transfer_requested" bool,"departure_special_transfer_datetime" timestamptz,"lift_pass_required" bool,"first_ski_day" date,"last_ski_day" date,"carre_neige_requested" bool default true,"lessons_required" bool,"lesson_type" text,"lesson_dates" date[] default '{}'::date[],"equipment_hire_required" bool,"boot_size" text,"source_payload" jsonb default '{}'::jsonb not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"submitted_via" text default 'web'::text not null,"public_reference" uuid default gen_random_uuid() not null,"submitted_on_behalf" bool default false not null,"submitter_name" text,"submitter_email" text,"arrival_details" text,"departure_details" text,"in_resort_details" text,"privacy_notice_version" text,"privacy_acknowledged_at" timestamptz);
create table public.push_subscriptions("id" uuid default gen_random_uuid() not null,"user_id" uuid not null,"endpoint" text not null,"p256dh" text not null,"auth_key" text not null,"user_agent" text,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.invitations("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"organisation_id" uuid,"sponsor_contact_id" uuid,"invitee_email" text not null,"invitee_name" text,"category" text,"invitation_status" text default 'pending'::text not null,"invitation_token" uuid default gen_random_uuid() not null,"sent_at" timestamptz,"responded_at" timestamptz,"jotform_submission_id" text,"notes" text,"created_at" timestamptz default now() not null,"role_position" text,"primary_representative" bool default false not null,"counts_against_room_allocation" bool default true not null,"intended_package" text,"last_reminder_at" timestamptz);
create table public.event_invoice_counters("event_id" uuid not null,"next_number" int4 default 1 not null,"updated_at" timestamptz default now() not null);
create table public.push_configuration("config_name" text not null,"vapid_public_key" text not null,"vapid_private_key" text not null,"subject" text not null,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.user_attendee_links("id" uuid default gen_random_uuid() not null,"user_id" uuid not null,"attendee_id" uuid not null,"event_id" uuid not null,"link_source" text default 'email_match'::text not null,"linked_at" timestamptz default now() not null);
create table public.bootstrap_claims("id" uuid default gen_random_uuid() not null,"purpose" text not null,"secret_sha256" text not null,"expires_at" timestamptz not null,"consumed_at" timestamptz,"consumed_by" uuid,"created_at" timestamptz default now() not null);
create table public.usage_extras("id" uuid default gen_random_uuid() not null,"attendee_id" uuid not null,"usage_date" date,"category" text not null,"quantity" numeric default 1 not null,"rate_code" text,"unit_rate" numeric,"chargeable" bool default true not null,"total_charge" numeric,"notes" text,"recorded_by" uuid,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"approved_exception" bool default false not null,"exception_reason" text,"exception_approved_by" uuid,"exception_approved_at" timestamptz);
create table public.travel_records("id" uuid default gen_random_uuid() not null,"attendee_id" uuid not null,"direction" text not null,"method_of_transport" text,"airport_station" text,"flight_travel_number" text,"travel_datetime" timestamptz,"resort_datetime" timestamptz,"transfer_requested" bool,"transfer_service" text,"transfer_chargeable" bool default false not null,"special_transfer_datetime" timestamptz,"assignment_notes" text,"protocol_confirmed" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"billing_reviewed" bool default false not null,"billing_review_notes" text,"billing_reviewed_by" uuid,"billing_reviewed_at" timestamptz);
create table public.event_room_inventory("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"location_id" uuid not null,"room_type_id" uuid,"room_count" int4 default 0 not null,"bed_count" int4,"notes" text,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.event_configuration_items("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"item_code" text not null,"title" text not null,"description" text not null,"status" text default 'pending'::text not null,"decision" text,"confirmed_by" uuid,"confirmed_at" timestamptz,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.intake_submissions("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"source" text default 'web'::text not null,"external_submission_id" text,"invitation_id" uuid,"invitation_code" text,"submitted_at" timestamptz default now() not null,"submitted_on_behalf" bool default false not null,"submitter_name" text,"submitter_email" text,"attendee_email" text,"processing_status" text default 'pending'::text not null,"mapping_version" text default 'web_v1'::text not null,"protocol_reviewed_by" uuid,"protocol_reviewed_at" timestamptz,"error_message" text,"raw_payload" jsonb not null,"created_at" timestamptz default now() not null,"mapped_attendee_id" uuid,"review_notes" text);
create table public.events("id" uuid default gen_random_uuid() not null,"name" text not null,"event_year" int4 not null,"start_date" date not null,"midweek_changeover_date" date,"end_date" date not null,"attendance_deadline" date,"invoice_prefix" text not null,"default_lift_pass_type" text default '3V'::text,"currency" text default 'GBP'::text not null,"active" bool default false not null,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"jotform_form_id" text,"jotform_form_url" text,"payment_terms_days" int4 default 14 not null,"invoice_issuer_name" text,"invoice_issuer_address" text,"invoice_issuer_legal_details" text,"invoice_payment_instructions" text,"invoice_footer" text,"billing_configuration_confirmed" bool default false not null,"invoice_default_payment_terms_days" int4 default 14 not null,"billing_configuration_confirmed_by" uuid,"billing_configuration_confirmed_at" timestamptz);
create table public.invoice_deliveries("id" uuid default gen_random_uuid() not null,"invoice_id" uuid not null,"event_id" uuid not null,"recipient_name" text,"recipient_email" text not null,"subject" text not null,"provider" text default 'resend'::text not null,"provider_message_id" text,"delivery_status" text default 'pending'::text not null,"requested_by" uuid,"requested_at" timestamptz default now() not null,"accepted_at" timestamptz,"error_message" text,"pdf_sha256" text,"created_at" timestamptz default now() not null);
create table public.schedule_items("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"venue_id" uuid,"title" text not null,"description" text,"starts_at" timestamptz not null,"ends_at" timestamptz,"category" text,"audience" text[] default ARRAY['all'::text] not null,"published" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"live_results_url" text,"stream_url" text,"attendee_notes" text);
create table public.event_documents("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"title" text not null,"category" text,"file_path" text,"external_url" text,"audience" text[] default ARRAY['all'::text] not null,"published" bool default false not null,"created_at" timestamptz default now() not null,"description" text,"storage_bucket" text,"storage_object_path" text,"updated_at" timestamptz default now() not null);
create table public.biographies("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"attendee_id" uuid,"display_name" text not null,"role_title" text,"organisation_name" text,"biography" text,"photo_path" text,"sort_order" int4 default 0 not null,"published" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"bio_category" text);
create table public.announcements("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"title" text not null,"body" text not null,"priority" text default 'normal'::text not null,"audience" text[] default ARRAY['all'::text] not null,"publish_at" timestamptz default now() not null,"expires_at" timestamptz,"push_notification" bool default false not null,"published" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"action_label" text,"action_url" text,"push_sent_at" timestamptz,"push_delivery_count" int4 default 0 not null,"push_failure_count" int4 default 0 not null,"push_sent_by" uuid);
create table public.table_plans("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"title" text not null,"event_date" date,"version" int4 default 1 not null,"file_path" text,"notes" text,"published" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"audience" text[] default ARRAY['attendees'::text] not null,"storage_bucket" text,"storage_object_path" text,"dinner_time" time,"venue_id" uuid,"published_by" uuid,"published_at" timestamptz);
create table public.seating_tables("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"schedule_item_id" uuid,"table_name" text not null,"capacity" int4,"sort_order" int4 default 0 not null,"published" bool default false not null,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"table_plan_id" uuid);
create table public.seating_assignments("id" uuid default gen_random_uuid() not null,"seating_table_id" uuid not null,"attendee_id" uuid,"seat_label" text,"notes" text,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"event_sponsor_id" uuid,"seat_number" int4 not null,"guest_name" text,"guest_role" text,"occupant_name_snapshot" text,"sponsor_host" bool default false not null);
create table public.race_results("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"schedule_item_id" uuid,"venue_id" uuid,"title" text not null,"discipline" text not null,"race_date" date not null,"summary" text,"storage_bucket" text,"storage_object_path" text,"original_filename" text,"external_url" text,"published" bool default false not null,"published_by" uuid,"published_at" timestamptz,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.event_media("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"schedule_item_id" uuid,"race_result_id" uuid,"title" text not null,"caption" text,"media_type" text default 'image'::text not null,"storage_bucket" text,"storage_object_path" text,"original_filename" text,"external_url" text,"credit" text,"sort_order" int4 default 0 not null,"published" bool default false not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.transfer_runs("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"direction" text not null,"transfer_name" text not null,"service_type" text,"departure_at" timestamptz not null,"pickup_location" text not null,"destination" text not null,"driver_name" text,"driver_mobile" text,"lead_traveller_attendee_id" uuid,"lead_traveller_name" text,"lead_traveller_mobile" text,"vehicle_details" text,"capacity" int4,"status" text default 'planned'::text not null,"attendee_notes" text,"protocol_notes" text,"published" bool default false not null,"created_by" uuid,"updated_by" uuid,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.transfer_passengers("id" uuid default gen_random_uuid() not null,"transfer_run_id" uuid not null,"attendee_id" uuid not null,"passenger_name_snapshot" text not null,"passenger_mobile_snapshot" text,"pickup_override" text,"passenger_notes" text,"sort_order" int4 default 0 not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.hotel_rooms("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"location_id" uuid not null,"source_key" text not null,"source_workbook" text,"source_sheet" text,"source_row" int4,"source_slot" int4,"room_reference" text not null,"room_number" text,"room_type_label" text,"bed_configuration" text,"capacity" int4 default 1 not null,"available_from" date not null,"available_to" date not null,"reserved_for" text,"source_cost_per_night" numeric,"source_cost_currency" text,"inventory_status" text default 'available'::text not null,"verified" bool default false not null,"notes" text,"sort_order" int4 default 0 not null,"active" bool default true not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.room_allocation_requests("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"source_type" text not null,"source_key" text not null,"source_active" bool default true not null,"booking_request_id" uuid,"stay_charge_period_id" uuid,"attendee_id" uuid,"display_name" text not null,"email" text,"mobile" text,"category" text,"organisation_name" text,"hotel_preference" text,"requested_check_in" date,"requested_check_out" date,"room_share_requested" bool default false not null,"requested_share_with" text,"occupancy_required" int4 default 1 not null,"room_setup_preference" text,"priority" text default 'normal'::text not null,"allocation_status" text default 'awaiting_review'::text not null,"protocol_notes" text,"created_by" uuid,"updated_by" uuid,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.hotel_room_allocations("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"request_id" uuid not null,"hotel_room_id" uuid not null,"attendee_id" uuid,"check_in" date not null,"check_out" date not null,"occupancy_count" int4 default 1 not null,"allocation_status" text default 'confirmed'::text not null,"hotel_name_snapshot" text not null,"room_reference_snapshot" text not null,"decision_notes" text,"decided_by" uuid not null,"decided_at" timestamptz default now() not null,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
create table public.event_email_settings("event_id" uuid not null,"invoice_from_email" text,"invoice_sender_name" text default 'UKAF WSA'::text not null,"invoice_reply_to" text,"active" bool default true not null,"updated_by" uuid,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null,"id" uuid default gen_random_uuid() not null);
create table public.notification_deliveries("id" uuid default gen_random_uuid() not null,"event_id" uuid not null,"announcement_id" uuid not null,"requested_by" uuid not null,"audience" text[] default ARRAY['all'::text] not null,"requested_at" timestamptz default now() not null,"completed_at" timestamptz,"eligible_count" int4 default 0 not null,"delivered_count" int4 default 0 not null,"failure_count" int4 default 0 not null,"delivery_status" text default 'processing'::text not null,"error_message" text);
create table public.attendee_service_items("id" uuid default gen_random_uuid() not null,"attendee_id" uuid not null,"service_type" text not null,"service_date" date,"title" text not null,"status" text default 'pending'::text not null,"quantity" numeric default 1 not null,"chargeable" bool default false not null,"rate_code" text,"attendee_details" text,"protocol_notes" text,"usage_extra_id" uuid,"recorded_by" uuid,"confirmed_by" uuid,"confirmed_at" timestamptz,"created_at" timestamptz default now() not null,"updated_at" timestamptz default now() not null);
alter table public.events add constraint events_date_order CHECK ((end_date >= start_date));
alter table public.events add constraint events_pkey PRIMARY KEY (id);
alter table public.events add constraint events_event_year_key UNIQUE (event_year);
alter table public.organisations add constraint organisations_pkey PRIMARY KEY (id);
alter table public.organisations add constraint organisations_organisation_name_key UNIQUE (organisation_name);
alter table public.event_sponsors add constraint event_sponsors_pkey PRIMARY KEY (id);
alter table public.event_sponsors add constraint event_sponsors_event_id_organisation_id_key UNIQUE (event_id, organisation_id);
alter table public.sponsor_contacts add constraint sponsor_contacts_pkey PRIMARY KEY (id);
alter table public.event_documents add constraint event_documents_pkey PRIMARY KEY (id);
alter table public.invitations add constraint invitations_pkey PRIMARY KEY (id);
alter table public.invitations add constraint invitations_event_id_invitee_email_key UNIQUE (event_id, invitee_email);
alter table public.attendees add constraint attendees_pkey PRIMARY KEY (id);
alter table public.attendees add constraint attendees_event_id_jotform_submission_id_key UNIQUE (event_id, jotform_submission_id);
alter table public.travel_records add constraint travel_records_direction_check CHECK ((direction = ANY (ARRAY['arrival'::text, 'departure'::text])));
alter table public.travel_records add constraint travel_records_pkey PRIMARY KEY (id);
alter table public.travel_records add constraint travel_records_attendee_id_direction_key UNIQUE (attendee_id, direction);
alter table public.accommodation_locations add constraint accommodation_locations_pkey PRIMARY KEY (id);
alter table public.accommodation_locations add constraint accommodation_locations_name_key UNIQUE (name);
alter table public.room_types add constraint room_types_pkey PRIMARY KEY (id);
alter table public.room_types add constraint room_types_location_id_name_key UNIQUE (location_id, name);
alter table public.stay_charge_periods add constraint stay_date_order CHECK (((actual_check_out IS NULL) OR (actual_check_in IS NULL) OR (actual_check_out >= actual_check_in)));
alter table public.stay_charge_periods add constraint billing_date_order CHECK (((billing_to IS NULL) OR (billing_from IS NULL) OR (billing_to >= billing_from)));
alter table public.stay_charge_periods add constraint stay_charge_periods_pkey PRIMARY KEY (id);
alter table public.invoice_lines add constraint invoice_lines_pkey PRIMARY KEY (id);
alter table public.seating_tables add constraint seating_tables_pkey PRIMARY KEY (id);
alter table public.lift_passes add constraint pass_date_order CHECK (((end_date IS NULL) OR (start_date IS NULL) OR (end_date >= start_date)));
alter table public.lift_passes add constraint lift_passes_pkey PRIMARY KEY (id);
alter table public.rate_card add constraint rate_nonnegative CHECK ((unit_price >= (0)::numeric));
alter table public.rate_card add constraint rate_card_pkey PRIMARY KEY (id);
alter table public.rate_card add constraint rate_card_event_id_rate_code_key UNIQUE (event_id, rate_code);
alter table public.usage_extras add constraint usage_quantity_nonnegative CHECK ((quantity >= (0)::numeric));
alter table public.usage_extras add constraint usage_extras_pkey PRIMARY KEY (id);
alter table public.invoices add constraint invoices_invoice_type_check CHECK ((invoice_type = ANY (ARRAY['individual'::text, 'consolidated_company'::text])));
alter table public.invoices add constraint invoice_target CHECK ((((invoice_type = 'individual'::text) AND (attendee_id IS NOT NULL)) OR ((invoice_type = 'consolidated_company'::text) AND (billing_account_organisation_id IS NOT NULL))));
alter table public.invoices add constraint invoices_pkey PRIMARY KEY (id);
alter table public.invoices add constraint invoices_invoice_reference_key UNIQUE (invoice_reference);
alter table public.invoice_adjustments add constraint invoice_adjustments_adjustment_type_check CHECK ((adjustment_type = ANY (ARRAY['fixed'::text, 'percentage'::text])));
alter table public.invoice_adjustments add constraint invoice_adjustments_direction_check CHECK ((direction = ANY (ARRAY['discount'::text, 'increase'::text])));
alter table public.invoice_adjustments add constraint adjustment_target CHECK (((invoice_id IS NOT NULL) OR (attendee_id IS NOT NULL)));
alter table public.invoice_adjustments add constraint adjustment_nonnegative CHECK ((value >= (0)::numeric));
alter table public.invoice_adjustments add constraint invoice_adjustments_pkey PRIMARY KEY (id);
alter table public.payments add constraint payment_nonnegative CHECK ((amount >= (0)::numeric));
alter table public.payments add constraint payments_pkey PRIMARY KEY (id);
alter table public.venues add constraint venues_pkey PRIMARY KEY (id);
alter table public.venues add constraint venues_event_id_name_key UNIQUE (event_id, name);
alter table public.schedule_items add constraint schedule_items_pkey PRIMARY KEY (id);
alter table public.announcements add constraint announcements_pkey PRIMARY KEY (id);
alter table public.biographies add constraint biographies_pkey PRIMARY KEY (id);
alter table public.table_plans add constraint table_plans_pkey PRIMARY KEY (id);
alter table public.profiles add constraint profiles_app_role_check CHECK ((app_role = ANY (ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'attendee'::text, 'read_only'::text])));
alter table public.profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table public.audit_log add constraint audit_log_pkey PRIMARY KEY (id);
alter table public.jotform_webhook_events add constraint jotform_webhook_events_processing_status_check CHECK ((processing_status = ANY (ARRAY['received'::text, 'processed'::text, 'needs_mapping'::text, 'error'::text, 'ignored'::text])));
alter table public.jotform_webhook_events add constraint jotform_webhook_events_pkey PRIMARY KEY (id);
alter table public.jotform_webhook_events add constraint jotform_webhook_events_form_id_submission_id_key UNIQUE (form_id, submission_id);
alter table public.jotform_field_mappings add constraint jotform_field_mappings_pkey PRIMARY KEY (id);
alter table public.jotform_field_mappings add constraint jotform_field_mappings_form_id_source_key_key UNIQUE (form_id, source_key);
alter table public.integration_settings add constraint integration_settings_pkey PRIMARY KEY (integration_name);
alter table public.booking_requests add constraint booking_requests_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text])));
alter table public.booking_requests add constraint booking_requests_pkey PRIMARY KEY (id);
alter table public.booking_requests add constraint booking_requests_event_id_invitation_id_key UNIQUE (event_id, invitation_id);
alter table public.seating_tables add constraint seating_tables_event_id_schedule_item_id_table_name_key UNIQUE (event_id, schedule_item_id, table_name);
alter table public.seating_assignments add constraint seating_assignments_pkey PRIMARY KEY (id);
alter table public.seating_assignments add constraint seating_assignments_seating_table_id_attendee_id_key UNIQUE (seating_table_id, attendee_id);
alter table public.push_subscriptions add constraint push_subscriptions_pkey PRIMARY KEY (id);
alter table public.push_subscriptions add constraint push_subscriptions_endpoint_key UNIQUE (endpoint);
alter table public.event_invoice_counters add constraint event_invoice_counters_next_number_check CHECK ((next_number > 0));
alter table public.event_invoice_counters add constraint event_invoice_counters_pkey PRIMARY KEY (event_id);
alter table public.bootstrap_claims add constraint bootstrap_claims_pkey PRIMARY KEY (id);
alter table public.bootstrap_claims add constraint bootstrap_claims_purpose_key UNIQUE (purpose);
alter table public.push_configuration add constraint push_configuration_pkey PRIMARY KEY (config_name);
alter table public.user_attendee_links add constraint user_attendee_links_pkey PRIMARY KEY (id);
alter table public.user_attendee_links add constraint user_attendee_links_user_id_event_id_key UNIQUE (user_id, event_id);
alter table public.user_attendee_links add constraint user_attendee_links_attendee_id_key UNIQUE (attendee_id);
alter table public.usage_extras add constraint usage_exception_reason_required CHECK (((NOT approved_exception) OR (NULLIF(TRIM(BOTH FROM exception_reason), ''::text) IS NOT NULL)));
alter table public.event_room_inventory add constraint event_room_inventory_room_count_check CHECK ((room_count >= 0));
alter table public.event_room_inventory add constraint event_room_inventory_bed_count_check CHECK (((bed_count IS NULL) OR (bed_count >= 0)));
alter table public.event_room_inventory add constraint event_room_inventory_pkey PRIMARY KEY (id);
alter table public.attendees add constraint attendees_participation_status_check CHECK ((participation_status = ANY (ARRAY['participant'::text, 'non_attending_companion'::text])));
alter table public.invoices add constraint invoices_payment_terms_days_check CHECK (((payment_terms_days IS NULL) OR ((payment_terms_days >= 0) AND (payment_terms_days <= 365))));
alter table public.events add constraint events_payment_terms_days_check CHECK (((payment_terms_days >= 0) AND (payment_terms_days <= 365)));
alter table public.event_configuration_items add constraint event_configuration_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'not_applicable'::text])));
alter table public.event_configuration_items add constraint event_configuration_items_pkey PRIMARY KEY (id);
alter table public.event_configuration_items add constraint event_configuration_items_event_id_item_code_key UNIQUE (event_id, item_code);
alter table public.intake_submissions add constraint intake_source_check CHECK ((source = ANY (ARRAY['web'::text, 'jotform'::text, 'import'::text, 'admin'::text])));
alter table public.intake_submissions add constraint intake_status_check CHECK ((processing_status = ANY (ARRAY['pending'::text, 'mapped'::text, 'review_required'::text, 'accepted'::text, 'rejected'::text, 'error'::text])));
alter table public.intake_submissions add constraint intake_submissions_pkey PRIMARY KEY (id);
alter table public.rate_card add constraint rate_card_status_check CHECK ((status = ANY (ARRAY['proposed'::text, 'approved'::text, 'retired'::text])));
alter table public.events add constraint events_invoice_default_payment_terms_days_check CHECK (((invoice_default_payment_terms_days >= 0) AND (invoice_default_payment_terms_days <= 365)));
alter table public.invoices add constraint invoices_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'awaiting_billing_update'::text, 'ready_for_review'::text, 'approved'::text, 'issued'::text, 'paid'::text, 'cancelled'::text, 'void'::text])));
alter table public.invoice_deliveries add constraint invoice_deliveries_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'accepted'::text, 'failed'::text, 'delivered'::text, 'bounced'::text, 'complained'::text])));
alter table public.invoice_deliveries add constraint invoice_deliveries_recipient_email_check CHECK (((length(TRIM(BOTH FROM recipient_email)) >= 3) AND (length(TRIM(BOTH FROM recipient_email)) <= 320)));
alter table public.invoice_deliveries add constraint invoice_deliveries_subject_check CHECK (((length(TRIM(BOTH FROM subject)) >= 1) AND (length(TRIM(BOTH FROM subject)) <= 250)));
alter table public.invoice_deliveries add constraint invoice_deliveries_pkey PRIMARY KEY (id);
alter table public.seating_tables add constraint seating_tables_capacity_check CHECK (((capacity >= 1) AND (capacity <= 10)));
alter table public.seating_assignments add constraint seating_assignments_seat_number_check CHECK (((seat_number >= 1) AND (seat_number <= 10)));
alter table public.seating_assignments add constraint seating_assignments_occupant_check CHECK (((attendee_id IS NOT NULL) OR (event_sponsor_id IS NOT NULL) OR (NULLIF(TRIM(BOTH FROM guest_name), ''::text) IS NOT NULL)));
alter table public.race_results add constraint race_results_source_check CHECK (((storage_object_path IS NOT NULL) OR (external_url IS NOT NULL) OR (summary IS NOT NULL)));
alter table public.race_results add constraint race_results_pkey PRIMARY KEY (id);
alter table public.event_media add constraint event_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])));
alter table public.event_media add constraint event_media_source_check CHECK (((storage_object_path IS NOT NULL) OR (external_url IS NOT NULL)));
alter table public.event_media add constraint event_media_pkey PRIMARY KEY (id);
alter table public.transfer_runs add constraint transfer_runs_direction_check CHECK ((direction = ANY (ARRAY['arrival'::text, 'departure'::text, 'local'::text])));
alter table public.transfer_runs add constraint transfer_runs_status_check CHECK ((status = ANY (ARRAY['planned'::text, 'confirmed'::text, 'departed'::text, 'completed'::text, 'cancelled'::text])));
alter table public.transfer_runs add constraint transfer_runs_capacity_check CHECK (((capacity IS NULL) OR ((capacity >= 1) AND (capacity <= 100))));
alter table public.transfer_runs add constraint transfer_runs_pkey PRIMARY KEY (id);
alter table public.transfer_passengers add constraint transfer_passengers_pkey PRIMARY KEY (id);
alter table public.transfer_passengers add constraint transfer_passengers_transfer_run_id_attendee_id_key UNIQUE (transfer_run_id, attendee_id);
alter table public.hotel_rooms add constraint hotel_rooms_capacity_check CHECK (((capacity >= 1) AND (capacity <= 10)));
alter table public.hotel_rooms add constraint hotel_rooms_dates_check CHECK ((available_to > available_from));
alter table public.hotel_rooms add constraint hotel_rooms_status_check CHECK ((inventory_status = ANY (ARRAY['available'::text, 'out_of_service'::text])));
alter table public.hotel_rooms add constraint hotel_rooms_pkey PRIMARY KEY (id);
alter table public.hotel_rooms add constraint hotel_rooms_event_id_source_key_key UNIQUE (event_id, source_key);
alter table public.hotel_rooms add constraint hotel_rooms_event_id_location_id_room_reference_key UNIQUE (event_id, location_id, room_reference);
alter table public.room_allocation_requests add constraint room_allocation_requests_source_check CHECK ((source_type = ANY (ARRAY['registration'::text, 'protocol'::text])));
alter table public.room_allocation_requests add constraint room_allocation_requests_occupancy_check CHECK (((occupancy_required >= 1) AND (occupancy_required <= 10)));
alter table public.room_allocation_requests add constraint room_allocation_requests_priority_check CHECK ((priority = ANY (ARRAY['normal'::text, 'priority'::text, 'urgent'::text])));
alter table public.room_allocation_requests add constraint room_allocation_requests_status_check CHECK ((allocation_status = ANY (ARRAY['awaiting_review'::text, 'allocated'::text, 'waitlist'::text, 'cancelled'::text])));
alter table public.room_allocation_requests add constraint room_allocation_requests_dates_check CHECK (((requested_check_in IS NULL) OR (requested_check_out IS NULL) OR (requested_check_out > requested_check_in)));
alter table public.room_allocation_requests add constraint room_allocation_requests_pkey PRIMARY KEY (id);
alter table public.room_allocation_requests add constraint room_allocation_requests_event_id_source_key_key UNIQUE (event_id, source_key);
alter table public.hotel_room_allocations add constraint hotel_room_allocations_dates_check CHECK ((check_out > check_in));
alter table public.hotel_room_allocations add constraint hotel_room_allocations_occupancy_check CHECK (((occupancy_count >= 1) AND (occupancy_count <= 10)));
alter table public.hotel_room_allocations add constraint hotel_room_allocations_status_check CHECK ((allocation_status = ANY (ARRAY['confirmed'::text, 'cancelled'::text])));
alter table public.hotel_room_allocations add constraint hotel_room_allocations_pkey PRIMARY KEY (id);
alter table public.hotel_room_allocations add constraint hotel_room_allocations_request_id_key UNIQUE (request_id);
alter table public.event_email_settings add constraint event_email_settings_from_check CHECK (((invoice_from_email IS NULL) OR ((invoice_from_email = lower(TRIM(BOTH FROM invoice_from_email))) AND ((length(invoice_from_email) >= 3) AND (length(invoice_from_email) <= 320)) AND (invoice_from_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text))));
alter table public.event_email_settings add constraint event_email_settings_reply_check CHECK (((invoice_reply_to IS NULL) OR ((invoice_reply_to = lower(TRIM(BOTH FROM invoice_reply_to))) AND ((length(invoice_reply_to) >= 3) AND (length(invoice_reply_to) <= 320)) AND (invoice_reply_to ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'::text))));
alter table public.event_email_settings add constraint event_email_settings_sender_name_check CHECK (((length(TRIM(BOTH FROM invoice_sender_name)) >= 1) AND (length(TRIM(BOTH FROM invoice_sender_name)) <= 100)));
alter table public.event_email_settings add constraint event_email_settings_pkey PRIMARY KEY (event_id);
alter table public.attendees add constraint attendees_record_source_check CHECK ((record_source = ANY (ARRAY['registration'::text, 'protocol_manual'::text])));
alter table public.notification_deliveries add constraint notification_deliveries_eligible_count_check CHECK ((eligible_count >= 0));
alter table public.notification_deliveries add constraint notification_deliveries_delivered_count_check CHECK ((delivered_count >= 0));
alter table public.notification_deliveries add constraint notification_deliveries_failure_count_check CHECK ((failure_count >= 0));
alter table public.notification_deliveries add constraint notification_deliveries_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['processing'::text, 'completed'::text, 'partial'::text, 'failed'::text])));
alter table public.notification_deliveries add constraint notification_delivery_counts_valid CHECK (((delivered_count + failure_count) <= eligible_count));
alter table public.notification_deliveries add constraint notification_deliveries_pkey PRIMARY KEY (id);
alter table public.lift_passes add constraint lift_passes_required_carre_neige_check CHECK (((NOT required) OR carre_neige_required));
alter table public.attendee_service_items add constraint attendee_service_items_service_type_check CHECK ((service_type = ANY (ARRAY['lesson'::text, 'equipment_hire'::text, 'dinner'::text, 'champagne'::text, 'other'::text])));
alter table public.attendee_service_items add constraint attendee_service_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text])));
alter table public.attendee_service_items add constraint attendee_service_items_quantity_check CHECK ((quantity > (0)::numeric));
alter table public.attendee_service_items add constraint attendee_service_items_check CHECK (((NOT chargeable) OR ((status = 'confirmed'::text) AND (rate_code IS NOT NULL))));
alter table public.attendee_service_items add constraint attendee_service_items_pkey PRIMARY KEY (id);
alter table public.attendee_service_items add constraint attendee_service_items_usage_extra_id_key UNIQUE (usage_extra_id);
alter table public.event_sponsors add constraint event_sponsors_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_sponsors add constraint event_sponsors_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT;
alter table public.sponsor_contacts add constraint sponsor_contacts_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE CASCADE;
alter table public.sponsor_contacts add constraint sponsor_contacts_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.invitations add constraint invitations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.invitations add constraint invitations_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL;
alter table public.invitations add constraint invitations_sponsor_contact_id_fkey FOREIGN KEY (sponsor_contact_id) REFERENCES sponsor_contacts(id) ON DELETE SET NULL;
alter table public.attendees add constraint attendees_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.attendees add constraint attendees_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL;
alter table public.attendees add constraint attendees_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES organisations(id) ON DELETE SET NULL;
alter table public.attendees add constraint attendees_billing_account_organisation_id_fkey FOREIGN KEY (billing_account_organisation_id) REFERENCES organisations(id) ON DELETE SET NULL;
alter table public.attendees add constraint attendees_linked_main_attendee_id_fkey FOREIGN KEY (linked_main_attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.travel_records add constraint travel_records_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.room_types add constraint room_types_location_id_fkey FOREIGN KEY (location_id) REFERENCES accommodation_locations(id) ON DELETE CASCADE;
alter table public.stay_charge_periods add constraint stay_charge_periods_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.stay_charge_periods add constraint stay_charge_periods_location_id_fkey FOREIGN KEY (location_id) REFERENCES accommodation_locations(id) ON DELETE RESTRICT;
alter table public.stay_charge_periods add constraint stay_charge_periods_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT;
alter table public.stay_charge_periods add constraint stay_charge_periods_sharing_with_attendee_id_fkey FOREIGN KEY (sharing_with_attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.invoice_lines add constraint invoice_lines_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public.lift_passes add constraint lift_passes_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.rate_card add constraint rate_card_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.rate_card add constraint rate_card_location_id_fkey FOREIGN KEY (location_id) REFERENCES accommodation_locations(id) ON DELETE RESTRICT;
alter table public.rate_card add constraint rate_card_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT;
alter table public.usage_extras add constraint usage_extras_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.invoices add constraint invoices_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
alter table public.invoices add constraint invoices_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE RESTRICT;
alter table public.invoices add constraint invoices_billing_account_organisation_id_fkey FOREIGN KEY (billing_account_organisation_id) REFERENCES organisations(id) ON DELETE RESTRICT;
alter table public.invoice_lines add constraint invoice_lines_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.invoice_adjustments add constraint invoice_adjustments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public.invoice_adjustments add constraint invoice_adjustments_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.payments add constraint payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE;
alter table public.venues add constraint venues_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.schedule_items add constraint schedule_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.schedule_items add constraint schedule_items_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
alter table public.announcements add constraint announcements_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.biographies add constraint biographies_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.biographies add constraint biographies_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.table_plans add constraint table_plans_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_documents add constraint event_documents_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.profiles add constraint profiles_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.jotform_webhook_events add constraint jotform_webhook_events_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.booking_requests add constraint booking_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.booking_requests add constraint booking_requests_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL;
alter table public.booking_requests add constraint booking_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.booking_requests add constraint booking_requests_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.booking_requests add constraint booking_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
alter table public.seating_tables add constraint seating_tables_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.seating_tables add constraint seating_tables_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES schedule_items(id) ON DELETE SET NULL;
alter table public.seating_assignments add constraint seating_assignments_seating_table_id_fkey FOREIGN KEY (seating_table_id) REFERENCES seating_tables(id) ON DELETE CASCADE;
alter table public.seating_assignments add constraint seating_assignments_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.push_subscriptions add constraint push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.event_invoice_counters add constraint event_invoice_counters_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.bootstrap_claims add constraint bootstrap_claims_consumed_by_fkey FOREIGN KEY (consumed_by) REFERENCES auth.users(id);
alter table public.user_attendee_links add constraint user_attendee_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table public.user_attendee_links add constraint user_attendee_links_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.user_attendee_links add constraint user_attendee_links_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.usage_extras add constraint usage_extras_exception_approved_by_fkey FOREIGN KEY (exception_approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.travel_records add constraint travel_records_billing_reviewed_by_fkey FOREIGN KEY (billing_reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.invoices add constraint invoices_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.invoices add constraint invoices_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.event_room_inventory add constraint event_room_inventory_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_room_inventory add constraint event_room_inventory_location_id_fkey FOREIGN KEY (location_id) REFERENCES accommodation_locations(id) ON DELETE RESTRICT;
alter table public.event_room_inventory add constraint event_room_inventory_room_type_id_fkey FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT;
alter table public.event_configuration_items add constraint event_configuration_items_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_configuration_items add constraint event_configuration_items_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id);
alter table public.invoices add constraint invoices_paid_by_fkey FOREIGN KEY (paid_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.table_plans add constraint table_plans_published_by_fkey FOREIGN KEY (published_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.seating_tables add constraint seating_tables_table_plan_id_fkey FOREIGN KEY (table_plan_id) REFERENCES table_plans(id) ON DELETE CASCADE;
alter table public.intake_submissions add constraint intake_submissions_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
alter table public.intake_submissions add constraint intake_submissions_invitation_id_fkey FOREIGN KEY (invitation_id) REFERENCES invitations(id) ON DELETE SET NULL;
alter table public.intake_submissions add constraint intake_submissions_protocol_reviewed_by_fkey FOREIGN KEY (protocol_reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.intake_submissions add constraint intake_submissions_mapped_attendee_id_fkey FOREIGN KEY (mapped_attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.rate_card add constraint rate_card_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.events add constraint events_billing_configuration_confirmed_by_fkey FOREIGN KEY (billing_configuration_confirmed_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.invoice_deliveries add constraint invoice_deliveries_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT;
alter table public.invoice_deliveries add constraint invoice_deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE RESTRICT;
alter table public.invoice_deliveries add constraint invoice_deliveries_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.table_plans add constraint table_plans_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
alter table public.seating_assignments add constraint seating_assignments_event_sponsor_id_fkey FOREIGN KEY (event_sponsor_id) REFERENCES event_sponsors(id) ON DELETE SET NULL;
alter table public.race_results add constraint race_results_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.race_results add constraint race_results_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES schedule_items(id) ON DELETE SET NULL;
alter table public.race_results add constraint race_results_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL;
alter table public.race_results add constraint race_results_published_by_fkey FOREIGN KEY (published_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.event_media add constraint event_media_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_media add constraint event_media_schedule_item_id_fkey FOREIGN KEY (schedule_item_id) REFERENCES schedule_items(id) ON DELETE SET NULL;
alter table public.event_media add constraint event_media_race_result_id_fkey FOREIGN KEY (race_result_id) REFERENCES race_results(id) ON DELETE SET NULL;
alter table public.transfer_runs add constraint transfer_runs_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.transfer_runs add constraint transfer_runs_lead_traveller_attendee_id_fkey FOREIGN KEY (lead_traveller_attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.transfer_runs add constraint transfer_runs_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.transfer_runs add constraint transfer_runs_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.transfer_passengers add constraint transfer_passengers_transfer_run_id_fkey FOREIGN KEY (transfer_run_id) REFERENCES transfer_runs(id) ON DELETE CASCADE;
alter table public.transfer_passengers add constraint transfer_passengers_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.hotel_rooms add constraint hotel_rooms_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.hotel_rooms add constraint hotel_rooms_location_id_fkey FOREIGN KEY (location_id) REFERENCES accommodation_locations(id) ON DELETE RESTRICT;
alter table public.room_allocation_requests add constraint room_allocation_requests_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.room_allocation_requests add constraint room_allocation_requests_booking_request_id_fkey FOREIGN KEY (booking_request_id) REFERENCES booking_requests(id) ON DELETE SET NULL;
alter table public.room_allocation_requests add constraint room_allocation_requests_stay_charge_period_id_fkey FOREIGN KEY (stay_charge_period_id) REFERENCES stay_charge_periods(id) ON DELETE SET NULL;
alter table public.room_allocation_requests add constraint room_allocation_requests_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.room_allocation_requests add constraint room_allocation_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.room_allocation_requests add constraint room_allocation_requests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.hotel_room_allocations add constraint hotel_room_allocations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.hotel_room_allocations add constraint hotel_room_allocations_request_id_fkey FOREIGN KEY (request_id) REFERENCES room_allocation_requests(id) ON DELETE CASCADE;
alter table public.hotel_room_allocations add constraint hotel_room_allocations_hotel_room_id_fkey FOREIGN KEY (hotel_room_id) REFERENCES hotel_rooms(id) ON DELETE RESTRICT;
alter table public.hotel_room_allocations add constraint hotel_room_allocations_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE SET NULL;
alter table public.hotel_room_allocations add constraint hotel_room_allocations_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.event_email_settings add constraint event_email_settings_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.event_email_settings add constraint event_email_settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.attendees add constraint attendees_source_created_by_fkey FOREIGN KEY (source_created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.announcements add constraint announcements_push_sent_by_fkey FOREIGN KEY (push_sent_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table public.notification_deliveries add constraint notification_deliveries_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
alter table public.notification_deliveries add constraint notification_deliveries_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
alter table public.notification_deliveries add constraint notification_deliveries_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES profiles(id) ON DELETE RESTRICT;
alter table public.attendee_service_items add constraint attendee_service_items_attendee_id_fkey FOREIGN KEY (attendee_id) REFERENCES attendees(id) ON DELETE CASCADE;
alter table public.attendee_service_items add constraint attendee_service_items_usage_extra_id_fkey FOREIGN KEY (usage_extra_id) REFERENCES usage_extras(id) ON DELETE SET NULL;
alter table public.attendee_service_items add constraint attendee_service_items_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table public.attendee_service_items add constraint attendee_service_items_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.update_stay_dates_service(p_stay_id uuid, p_actual_check_in date, p_actual_check_out date, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations']);
  if p_actual_check_in is not null and p_actual_check_out is not null and p_actual_check_out<=p_actual_check_in then raise exception 'Invalid stay dates'; end if;
  update public.stay_charge_periods set actual_check_in=p_actual_check_in,actual_check_out=p_actual_check_out,updated_at=now() where id=p_stay_id;
  if not found then raise exception 'Stay not found'; end if;
  return p_stay_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ begin new.updated_at = now(); return new; end; $function$
;
CREATE OR REPLACE FUNCTION private.has_staff_role(roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.app_role = any(roles));
$function$
;
CREATE OR REPLACE FUNCTION private.audit_row_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' then
    insert into public.audit_log(table_name, record_id, action, actor_id, before_data) values (tg_table_name, old.id, tg_op, auth.uid(), to_jsonb(old));
    return old;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log(table_name, record_id, action, actor_id, before_data, after_data) values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log(table_name, record_id, action, actor_id, after_data) values (tg_table_name, new.id, tg_op, auth.uid(), to_jsonb(new));
    return new;
  end if;
end; $function$
;
CREATE OR REPLACE FUNCTION public.update_invoice_payment_service(p_invoice_id uuid, p_payment_link text, p_due_date date, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  update public.invoices
  set payment_link=nullif(trim(p_payment_link),''),due_date=p_due_date,updated_at=now()
  where id=p_invoice_id and status not in ('paid','void','cancelled');
  if not found then raise exception 'Invoice not found or cannot be updated in its current status'; end if;
  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.is_own_attendee(target_attendee uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.active and p.attendee_id=target_attendee
  )
  or exists (
    select 1 from public.user_attendee_links l
    join public.profiles p on p.id=l.user_id
    where l.user_id=(select auth.uid()) and l.attendee_id=target_attendee and p.active
  );
$function$
;
CREATE OR REPLACE FUNCTION public.find_event_rate(p_attendee_id uuid, p_rate_code text)
 RETURNS rate_card
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select rc.*
  from public.rate_card rc
  join public.attendees a on a.event_id = rc.event_id
  where a.id = p_attendee_id
    and rc.rate_code = p_rate_code
    and rc.active = true
  order by case rc.status when 'approved' then 0 when 'proposed' then 1 else 2 end, rc.created_at desc
  limit 1;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_stay_charge()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  r public.rate_card;
begin
  if new.billing_from is not null and new.billing_to is not null then
    new.billable_nights := greatest(0, new.billing_to - new.billing_from);
  end if;

  if new.rate_code is not null then
    select * into r from public.find_event_rate(new.attendee_id, new.rate_code);
    if r.id is null then
      raise exception 'No active event rate found for %', new.rate_code;
    end if;
    new.unit_rate := r.unit_price;
    if coalesce(new.billable_nights,0) > 0 then
      new.accommodation_charge := round((new.billable_nights * r.unit_price)::numeric,2);
    else
      new.accommodation_charge := 0;
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.next_invoice_reference(p_event_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_prefix text;
  v_number integer;
begin
  select invoice_prefix into v_prefix from public.events where id=p_event_id;
  if v_prefix is null then raise exception 'Event not found'; end if;
  insert into public.event_invoice_counters(event_id,next_number)
  values(p_event_id,2)
  on conflict(event_id) do update set next_number=public.event_invoice_counters.next_number+1,updated_at=now()
  returning next_number-1 into v_number;
  return v_prefix || '-' || lpad(v_number::text,4,'0');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_booking_request_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  new.updated_at = now();
  if new.status = 'submitted' and old.status is distinct from new.status and new.submitted_at is null then
    new.submitted_at = now();
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_usage_charge()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare r public.rate_card;
begin
  if new.rate_code is null then
    new.rate_code := public.default_usage_rate_code(new.attendee_id,new.category);
  end if;
  if new.rate_code is null then raise exception 'No default rate mapping for usage category %',new.category; end if;
  select * into r from public.find_event_rate(new.attendee_id,new.rate_code);
  if r.id is null then raise exception 'No active event rate found for %',new.rate_code; end if;
  new.unit_rate := r.unit_price;
  new.total_charge := case when coalesce(new.chargeable,true) then round((coalesce(new.quantity,0)*r.unit_price)::numeric,2) else 0 end;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_attendee uuid;
  v_role text:='attendee';
  v_active boolean:=true;
  v_display_name text;
begin
  if new.email is not null then
    select a.app_role,a.active,a.display_name
    into v_role,v_active,v_display_name
    from private.staff_access_allowlist a
    where a.email=lower(new.email)
    limit 1;

    if not found and exists(
      select 1 from private.initial_admin_allowlist x
      where x.active and lower(x.email)=lower(new.email)
    ) then
      v_role:='admin';v_active:=true;
    end if;
  end if;

  insert into public.profiles(id,display_name,email,app_role,active)
  values(
    new.id,
    coalesce(v_display_name,new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'full_name',split_part(coalesce(new.email,''),'@',1)),
    new.email,v_role,v_active
  )
  on conflict(id) do update set
    email=excluded.email,
    display_name=coalesce(v_display_name,public.profiles.display_name),
    app_role=case when v_role<>'attendee' then v_role else public.profiles.app_role end,
    active=case when v_role<>'attendee' then v_active else public.profiles.active end,
    updated_at=now();

  if new.email is not null then
    update public.booking_requests
    set user_id=new.id,updated_at=now()
    where user_id is null and lower(email)=lower(new.email)
      and status in ('draft','submitted','accepted');

    insert into public.user_attendee_links(user_id,attendee_id,event_id,link_source)
    select new.id,a.id,a.event_id,'email_match'
    from public.attendees a where lower(a.email)=lower(new.email)
    on conflict do nothing;

    select a.id into v_attendee
    from public.attendees a
    join public.events e on e.id=a.event_id
    where lower(a.email)=lower(new.email)
    order by e.active desc,e.event_year desc limit 1;

    if v_attendee is not null then
      update public.profiles set attendee_id=v_attendee,updated_at=now() where id=new.id;
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.accept_booking_request_service(p_request_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select private.accept_booking_request_service(p_request_id, p_actor_id);
$function$
;
CREATE OR REPLACE FUNCTION private.link_attendee_to_existing_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if nullif(btrim(new.email), '') is null then
    return new;
  end if;

  insert into public.user_attendee_links (user_id, attendee_id, event_id, link_source)
  select u.id, new.id, new.event_id, 'email_match'
  from auth.users u
  join public.profiles p on p.id = u.id and p.active
  where lower(u.email) = lower(btrim(new.email))
  on conflict do nothing;

  update public.profiles p
  set attendee_id = new.id,
      updated_at = now()
  from auth.users u
  where p.id = u.id
    and p.attendee_id is null
    and lower(u.email) = lower(btrim(new.email));

  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.rebuild_consolidated_invoice(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  inv public.invoices;
  adj record;
  base_amount numeric;
  adj_amount numeric;
begin
  select * into inv from public.invoices where id=p_invoice_id for update;
  if inv.id is null then raise exception 'Invoice not found'; end if;
  if inv.invoice_type<>'consolidated_company' or inv.billing_account_organisation_id is null then raise exception 'Invoice must be a consolidated company invoice'; end if;
  if inv.status in ('issued','paid') then raise exception 'Issued invoices are immutable'; end if;
  delete from public.invoice_lines where invoice_id=p_invoice_id;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id,s.attendee_id,'stay',s.id,concat_ws(' ',a.first_name,a.surname)||' — '||coalesce(rc.description,'Accommodation'),coalesce(s.billable_nights,0),coalesce(s.unit_rate,0),coalesce(s.accommodation_charge,0),coalesce(rc.vat_rate,0),round(coalesce(s.accommodation_charge,0)*coalesce(rc.vat_rate,0)/100,2),round(coalesce(s.accommodation_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2),s.rate_code
  from public.stay_charge_periods s join public.attendees a on a.id=s.attendee_id
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=s.rate_code and rc.active
  where a.event_id=inv.event_id and a.billing_account_organisation_id=inv.billing_account_organisation_id and a.consolidated_invoice_included and coalesce(s.accommodation_charge,0)<>0;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id,l.attendee_id,'lift_pass',l.id,concat_ws(' ',a.first_name,a.surname)||' — '||coalesce(rc.description,'Lift Pass'),coalesce(l.pass_days,0),coalesce(l.unit_rate,0),coalesce(l.total_charge,0),coalesce(rc.vat_rate,0),round(coalesce(l.total_charge,0)*coalesce(rc.vat_rate,0)/100,2),round(coalesce(l.total_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2),l.rate_code
  from public.lift_passes l join public.attendees a on a.id=l.attendee_id
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=l.rate_code and rc.active
  where a.event_id=inv.event_id and a.billing_account_organisation_id=inv.billing_account_organisation_id and a.consolidated_invoice_included and coalesce(l.total_charge,0)<>0;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id,u.attendee_id,'usage',u.id,concat_ws(' ',a.first_name,a.surname)||' — '||coalesce(rc.description,u.category),coalesce(u.quantity,0),coalesce(u.unit_rate,0),coalesce(u.total_charge,0),coalesce(rc.vat_rate,0),round(coalesce(u.total_charge,0)*coalesce(rc.vat_rate,0)/100,2),round(coalesce(u.total_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2),u.rate_code
  from public.usage_extras u join public.attendees a on a.id=u.attendee_id
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=u.rate_code and rc.active
  where a.event_id=inv.event_id and a.billing_account_organisation_id=inv.billing_account_organisation_id and a.consolidated_invoice_included and coalesce(u.total_charge,0)<>0 and not public.usage_charge_suppressed(u.id);

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id,u.attendee_id,'usage_vat',u.id,concat_ws(' ',a.first_name,a.surname)||' — '||vat_rc.description,u.quantity,vat_rc.unit_price,0,0,round(u.quantity*vat_rc.unit_price,2),round(u.quantity*vat_rc.unit_price,2),vat_rc.rate_code
  from public.usage_extras u join public.attendees a on a.id=u.attendee_id
  join public.rate_card base_rc on base_rc.event_id=inv.event_id and base_rc.rate_code=u.rate_code and base_rc.active and base_rc.paired_rate_code is not null
  join public.rate_card vat_rc on vat_rc.event_id=inv.event_id and vat_rc.rate_code=base_rc.paired_rate_code and vat_rc.active and vat_rc.tax_treatment='explicit_vat_amount'
  where a.event_id=inv.event_id and a.billing_account_organisation_id=inv.billing_account_organisation_id and a.consolidated_invoice_included and coalesce(u.chargeable,true) and coalesce(u.quantity,0)>0 and not public.usage_charge_suppressed(u.id);

  select coalesce(sum(net_amount+vat_amount),0) into base_amount from public.invoice_lines where invoice_id=p_invoice_id;
  for adj in select * from public.invoice_adjustments where invoice_id=p_invoice_id and approved loop
    if adj.adjustment_type='percentage' then adj_amount:=round(base_amount*adj.value/100,2); else adj_amount:=round(adj.value,2); end if;
    if adj.direction='discount' then adj_amount:=-abs(adj_amount); else adj_amount:=abs(adj_amount); end if;
    insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
    values(p_invoice_id,adj.attendee_id,'adjustment',adj.id,adj.description,1,adj_amount,adj_amount,0,0,adj_amount,null);
  end loop;

  update public.invoices i set net_total=x.net_total,vat_total=x.vat_total,gross_total=x.gross_total,updated_at=now()
  from (select coalesce(sum(net_amount),0) net_total,coalesce(sum(vat_amount),0) vat_total,coalesce(sum(gross_amount),0) gross_total from public.invoice_lines where invoice_id=p_invoice_id) x
  where i.id=p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.accept_booking_request_service(p_request_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'private'
AS $function$
declare
  r public.booking_requests%rowtype;
  v_attendee uuid;
  v_role text;
  v_default_pass text;
begin
  select app_role into v_role from public.profiles where id=p_actor_id and active=true;
  if v_role not in ('admin','protocol','operations') then raise exception 'Not authorised'; end if;
  select * into r from public.booking_requests where id=p_request_id for update;
  if not found then raise exception 'Booking request not found'; end if;
  if r.status not in ('submitted','accepted') then raise exception 'Booking request must be submitted'; end if;
  select coalesce(default_lift_pass_type,'3V') into v_default_pass from public.events where id=r.event_id;

  if r.attendee_id is null then
    insert into public.attendees(event_id,invitation_id,organisation_id,billing_account_organisation_id,invitation_status,attendance_status,category,title_rank,first_name,surname,post_nominals,email,mobile,service,discipline,position_role,dietary_requirements,date_of_birth,equipment_hire_required,boot_size,attendee_notes,source_last_updated_at)
    select r.event_id,r.invitation_id,i.organisation_id,i.organisation_id,'responded','expected',coalesce(r.category,i.category),r.title_rank,r.first_name,r.surname,r.post_nominals,r.email,r.mobile,r.service,r.discipline,r.position_role,r.dietary_requirements,r.date_of_birth,r.equipment_hire_required,r.boot_size,r.other_information,now()
    from (select 1) x left join public.invitations i on i.id=r.invitation_id
    returning id into v_attendee;
    update public.booking_requests set attendee_id=v_attendee,status='accepted',reviewed_at=now(),reviewed_by=p_actor_id where id=r.id;
  else
    v_attendee:=r.attendee_id;
    update public.booking_requests set status='accepted',reviewed_at=now(),reviewed_by=p_actor_id where id=r.id;
  end if;

  if not exists(select 1 from public.travel_records where attendee_id=v_attendee and direction='arrival') and (r.arrival_method is not null or r.arrival_datetime is not null or r.arrival_transfer_requested is not null) then
    insert into public.travel_records(attendee_id,direction,method_of_transport,airport_station,flight_travel_number,travel_datetime,resort_datetime,transfer_requested,special_transfer_datetime,assignment_notes,protocol_confirmed)
    values(v_attendee,'arrival',r.arrival_method,r.arrival_airport_station,r.arrival_flight_number,r.arrival_datetime,r.arrival_resort_datetime,r.arrival_transfer_requested,r.arrival_special_transfer_datetime,r.arrival_details,false);
  end if;
  if not exists(select 1 from public.travel_records where attendee_id=v_attendee and direction='departure') and (r.departure_method is not null or r.departure_datetime is not null or r.departure_transfer_requested is not null) then
    insert into public.travel_records(attendee_id,direction,method_of_transport,airport_station,flight_travel_number,travel_datetime,resort_datetime,transfer_requested,special_transfer_datetime,assignment_notes,protocol_confirmed)
    values(v_attendee,'departure',r.departure_method,r.departure_airport_station,r.departure_flight_number,r.departure_datetime,r.departure_resort_datetime,r.departure_transfer_requested,r.departure_special_transfer_datetime,r.departure_details,false);
  end if;
  if coalesce(r.accommodation_required,false) and not exists(select 1 from public.stay_charge_periods where attendee_id=v_attendee) then
    insert into public.stay_charge_periods(attendee_id,requested_location,requested_check_in,requested_check_out,requested_room_share,requested_share_with,requested_dinners,protocol_confirmed)
    values(v_attendee,r.hotel_preference,r.accommodation_from,r.accommodation_to,r.room_share_requested,r.room_share_with,r.dinners_with_guests,false);
  end if;
  if coalesce(r.lift_pass_required,false) and not exists(select 1 from public.lift_passes where attendee_id=v_attendee) then
    insert into public.lift_passes(attendee_id,required,pass_type,start_date,end_date,carre_neige_required,chargeable,protocol_confirmed,notes)
    values(v_attendee,true,v_default_pass,r.first_ski_day,r.last_ski_day,coalesce(r.carre_neige_requested,true),true,false,case when r.lessons_required then 'Lesson request retained in booking request; Protocol must confirm actual lesson usage separately.' else null end);
  end if;

  update public.profiles set attendee_id=v_attendee where id=r.user_id and attendee_id is null;
  if r.user_id is not null then
    insert into public.user_attendee_links(user_id,attendee_id,event_id,link_source)
    values(r.user_id,v_attendee,r.event_id,'booking_accept')
    on conflict(attendee_id) do nothing;
  end if;
  if r.invitation_id is not null then update public.invitations set invitation_status='responded',responded_at=coalesce(responded_at,now()) where id=r.invitation_id; end if;
  return v_attendee;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_or_rebuild_individual_invoice_service(p_attendee_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  a public.attendees%rowtype;
  v_invoice_id uuid;
  v_ref text;
  v_ready boolean;
  v_terms integer;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  select * into a from public.attendees where id=p_attendee_id;
  if a.id is null then raise exception 'Attendee not found'; end if;
  select ready_for_invoice into v_ready from public.v_invoice_readiness where attendee_id=p_attendee_id;
  if coalesce(v_ready,false) is not true then raise exception 'Attendee is not ready for invoice'; end if;
  select payment_terms_days into v_terms from public.events where id=a.event_id;

  select id into v_invoice_id from public.invoices
  where attendee_id=p_attendee_id and invoice_type='individual' and status in ('draft','awaiting_billing_update','ready_for_review')
  order by created_at desc limit 1;

  if v_invoice_id is null then
    v_ref:=private.next_invoice_reference(a.event_id);
    insert into public.invoices(event_id,attendee_id,billing_account_organisation_id,invoice_type,invoice_reference,status,notes,payment_terms_days)
    values(a.event_id,a.id,a.billing_account_organisation_id,'individual',v_ref,'draft','Created by ISSSC web finance workflow',coalesce(v_terms,14))
    returning id into v_invoice_id;
  else
    update public.invoices set payment_terms_days=coalesce(payment_terms_days,v_terms,14) where id=v_invoice_id;
  end if;

  perform public.rebuild_individual_invoice(v_invoice_id);
  update public.invoices set status='ready_for_review',updated_at=now() where id=v_invoice_id and status='draft';
  return v_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_or_rebuild_consolidated_invoice_service(p_event_id uuid, p_organisation_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_invoice_id uuid;
  v_ref text;
  v_count integer;
  v_not_ready integer;
  v_terms integer;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);

  select count(*) into v_count
  from public.attendees
  where event_id=p_event_id and billing_account_organisation_id=p_organisation_id and consolidated_invoice_included;
  if v_count=0 then raise exception 'No attendees are selected for this billing organisation'; end if;

  select count(*) into v_not_ready
  from public.attendees a
  left join public.v_invoice_readiness r on r.attendee_id=a.id
  where a.event_id=p_event_id and a.billing_account_organisation_id=p_organisation_id and a.consolidated_invoice_included and coalesce(r.ready_for_invoice,false)=false;
  if v_not_ready>0 then raise exception 'One or more selected attendees are not ready for invoice'; end if;

  select payment_terms_days into v_terms from public.events where id=p_event_id;

  select id into v_invoice_id from public.invoices
  where event_id=p_event_id and billing_account_organisation_id=p_organisation_id and invoice_type='consolidated_company'
    and status in ('draft','awaiting_billing_update','ready_for_review')
  order by created_at desc limit 1;

  if v_invoice_id is null then
    v_ref:=private.next_invoice_reference(p_event_id);
    insert into public.invoices(event_id,billing_account_organisation_id,invoice_type,invoice_reference,status,notes,payment_terms_days)
    values(p_event_id,p_organisation_id,'consolidated_company',v_ref,'draft','Created by ISSSC web finance workflow',coalesce(v_terms,14))
    returning id into v_invoice_id;
  else
    update public.invoices set payment_terms_days=coalesce(payment_terms_days,v_terms,14) where id=v_invoice_id;
  end if;

  perform public.rebuild_consolidated_invoice(v_invoice_id);
  update public.invoices set status='ready_for_review',updated_at=now() where id=v_invoice_id and status='draft';
  return v_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.guard_issued_invoice_adjustments()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare v_status text; begin
  if coalesce(new.invoice_id,old.invoice_id) is not null then
    select status into v_status from public.invoices where id=coalesce(new.invoice_id,old.invoice_id);
    if v_status in ('issued','paid') then raise exception 'Adjustments cannot change after invoice issue'; end if;
  end if;
  return coalesce(new,old);
end $function$
;
CREATE OR REPLACE FUNCTION private.guard_issued_invoice_header()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if old.status in ('approved', 'issued', 'paid') then
    if new.invoice_reference is distinct from old.invoice_reference
       or new.event_id is distinct from old.event_id
       or new.attendee_id is distinct from old.attendee_id
       or new.billing_account_organisation_id is distinct from old.billing_account_organisation_id
       or new.invoice_type is distinct from old.invoice_type
       or new.net_total is distinct from old.net_total
       or new.vat_total is distinct from old.vat_total
       or new.gross_total is distinct from old.gross_total then
      raise exception 'Confirmed invoice financial data is immutable';
    end if;
    if old.status = 'paid' and new.status is distinct from 'paid' then
      raise exception 'Paid invoice status cannot be reversed';
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.require_actor_role(p_actor_id uuid, p_roles text[])
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_role text; begin
  select app_role into v_role from public.profiles where id=p_actor_id and active=true;
  if v_role is null or not (v_role=any(p_roles)) then raise exception 'Not authorised'; end if;
  return v_role;
end $function$
;
CREATE OR REPLACE FUNCTION private.guard_issued_invoice_lines()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_status text;
begin
  select i.status into v_status
  from public.invoices i
  where i.id = case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;

  if v_status in ('approved', 'issued', 'paid') then
    raise exception 'Confirmed invoice lines are immutable';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_sponsor_invitation_service(p_event_id uuid, p_organisation_id uuid, p_invitee_email text, p_invitee_name text, p_category text, p_role_position text, p_primary_representative boolean, p_intended_package text, p_actor_id uuid)
 RETURNS TABLE(invitation_id uuid, invitation_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_id uuid; v_token uuid; begin
  perform private.require_actor_role(p_actor_id,array['admin','sponsor_manager','protocol']);
  if not exists(select 1 from public.event_sponsors where event_id=p_event_id and organisation_id=p_organisation_id and active=true) then
    raise exception 'Organisation is not active for this event';
  end if;
  insert into public.invitations(event_id,organisation_id,invitee_email,invitee_name,category,role_position,primary_representative,intended_package,invitation_status)
  values(p_event_id,p_organisation_id,lower(trim(p_invitee_email)),nullif(trim(p_invitee_name),''),p_category,nullif(trim(p_role_position),''),coalesce(p_primary_representative,false),nullif(trim(p_intended_package),''),'pending')
  returning id, public.invitations.invitation_token into v_id,v_token;
  return query select v_id,v_token;
end $function$
;
CREATE OR REPLACE FUNCTION public.confirm_lift_pass_service(p_lift_pass_id uuid, p_rate_code text, p_chargeable boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_rate numeric;
  v_event uuid;
  v_category text;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations','finance']);
  select a.event_id into v_event from public.lift_passes l join public.attendees a on a.id=l.attendee_id where l.id=p_lift_pass_id;
  if v_event is null then raise exception 'Lift pass not found'; end if;
  if coalesce(p_chargeable,true) then
    select unit_price,charge_category into v_rate,v_category
    from public.rate_card
    where event_id=v_event and rate_code=p_rate_code and active=true
    order by case when status='approved' then 0 else 1 end,updated_at desc limit 1;
    if v_rate is null then raise exception 'Rate code not found'; end if;
    if v_category<>'lift_pass' then raise exception 'Selected rate is not a lift-pass rate'; end if;
  else
    v_rate:=0;
  end if;
  update public.lift_passes
  set chargeable=coalesce(p_chargeable,true),rate_code=case when p_chargeable then p_rate_code else null end,unit_rate=v_rate,protocol_confirmed=true,updated_at=now()
  where id=p_lift_pass_id;
  return p_lift_pass_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_stay_exception_service(p_stay_id uuid, p_approved boolean, p_notes text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol']);
  if coalesce(p_approved,false) and nullif(trim(p_notes),'') is null then raise exception 'An approved exception requires a reason'; end if;
  update public.stay_charge_periods
  set approved_exception=coalesce(p_approved,false),
      exception_approved_by=case when coalesce(p_approved,false) then p_actor_id else null end,
      exception_notes=case when coalesce(p_approved,false) then nullif(trim(p_notes),'') else null end,
      updated_at=now()
  where id=p_stay_id;
  if not found then raise exception 'Stay not found'; end if;
  return p_stay_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.prevent_locked_invoice_line_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_status text;
begin
  select i.status into v_status
  from public.invoices i
  where i.id = case when tg_op = 'DELETE' then old.invoice_id else new.invoice_id end;

  if v_status in ('approved', 'issued', 'paid', 'cancelled', 'void') then
    raise exception 'Invoice lines are locked once an invoice is confirmed or closed';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.mark_attendee_checked_service(p_attendee_id uuid, p_exception_flag boolean, p_exception_reason text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations','finance']);
  update public.attendees set data_checked=true,checked_by=p_actor_id,checked_at=now(),exception_flag=coalesce(p_exception_flag,false),exception_reason=case when p_exception_flag then nullif(trim(p_exception_reason),'') else null end,updated_at=now() where id=p_attendee_id;
  if not found then raise exception 'Attendee not found'; end if;
  return p_attendee_id;
end $function$
;
CREATE OR REPLACE FUNCTION private.prevent_locked_invoice_rebuild()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.status in ('approved', 'issued', 'paid', 'cancelled', 'void') then
    if new.net_total is distinct from old.net_total
       or new.vat_total is distinct from old.vat_total
       or new.gross_total is distinct from old.gross_total
       or new.attendee_id is distinct from old.attendee_id
       or new.billing_account_organisation_id is distinct from old.billing_account_organisation_id
       or new.invoice_type is distinct from old.invoice_type then
      raise exception 'Confirmed or closed invoice financial fields are immutable';
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.claim_initial_admin_service(p_actor_id uuid, p_secret_sha256 text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare c public.bootstrap_claims%rowtype; v_role text; begin
  select * into c from public.bootstrap_claims where purpose='initial_admin' for update;
  if c.id is null or c.consumed_at is not null or c.expires_at<now() then raise exception 'Bootstrap claim unavailable'; end if;
  if c.secret_sha256<>p_secret_sha256 then raise exception 'Invalid bootstrap code'; end if;
  if not exists(select 1 from auth.users where id=p_actor_id) then raise exception 'User not found'; end if;
  if exists(select 1 from public.profiles where app_role='admin' and active=true and id<>p_actor_id) then raise exception 'An administrator already exists'; end if;
  insert into public.profiles(id,display_name,app_role,active)
  values(p_actor_id,coalesce((select raw_user_meta_data->>'full_name' from auth.users where id=p_actor_id),'ISSSC Administrator'),'admin',true)
  on conflict(id) do update set app_role='admin',active=true,updated_at=now();
  update public.bootstrap_claims set consumed_at=now(),consumed_by=p_actor_id where id=c.id;
  return 'admin';
end $function$
;
CREATE OR REPLACE FUNCTION public.rebuild_individual_invoice(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  inv public.invoices;
  adj record;
  base_net numeric;
  adj_amount numeric;
begin
  select * into inv from public.invoices where id = p_invoice_id for update;
  if inv.id is null then raise exception 'Invoice not found'; end if;
  if inv.invoice_type <> 'individual' or inv.attendee_id is null then raise exception 'Invoice must be individual and linked to an attendee'; end if;
  if inv.status in ('issued','paid') then raise exception 'Issued invoices are immutable'; end if;

  delete from public.invoice_lines where invoice_id = p_invoice_id;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id, s.attendee_id, 'stay', s.id,
         coalesce(rc.description,'Accommodation'), coalesce(s.billable_nights,0), coalesce(s.unit_rate,0), coalesce(s.accommodation_charge,0),
         coalesce(rc.vat_rate,0), round(coalesce(s.accommodation_charge,0)*coalesce(rc.vat_rate,0)/100,2),
         round(coalesce(s.accommodation_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2), s.rate_code
  from public.stay_charge_periods s
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=s.rate_code and rc.active
  where s.attendee_id=inv.attendee_id and coalesce(s.accommodation_charge,0)<>0;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id, l.attendee_id, 'lift_pass', l.id,
         coalesce(rc.description,'Lift Pass'), coalesce(l.pass_days,0), coalesce(l.unit_rate,0), coalesce(l.total_charge,0),
         coalesce(rc.vat_rate,0), round(coalesce(l.total_charge,0)*coalesce(rc.vat_rate,0)/100,2),
         round(coalesce(l.total_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2), l.rate_code
  from public.lift_passes l
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=l.rate_code and rc.active
  where l.attendee_id=inv.attendee_id and coalesce(l.total_charge,0)<>0;

  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id, u.attendee_id, 'usage', u.id,
         coalesce(rc.description,u.category), coalesce(u.quantity,0), coalesce(u.unit_rate,0), coalesce(u.total_charge,0),
         coalesce(rc.vat_rate,0), round(coalesce(u.total_charge,0)*coalesce(rc.vat_rate,0)/100,2),
         round(coalesce(u.total_charge,0)*(1+coalesce(rc.vat_rate,0)/100),2), u.rate_code
  from public.usage_extras u
  left join public.rate_card rc on rc.event_id=inv.event_id and rc.rate_code=u.rate_code and rc.active
  where u.attendee_id=inv.attendee_id and coalesce(u.total_charge,0)<>0;

  -- Some source rate cards express VAT as a separate fixed per-unit line rather than a percentage.
  insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
  select p_invoice_id, u.attendee_id, 'usage_vat', u.id, vat_rc.description, u.quantity, vat_rc.unit_price,
         0, 0, round(u.quantity*vat_rc.unit_price,2), round(u.quantity*vat_rc.unit_price,2), vat_rc.rate_code
  from public.usage_extras u
  join public.rate_card base_rc on base_rc.event_id=inv.event_id and base_rc.rate_code=u.rate_code and base_rc.active and base_rc.paired_rate_code is not null
  join public.rate_card vat_rc on vat_rc.event_id=inv.event_id and vat_rc.rate_code=base_rc.paired_rate_code and vat_rc.active and vat_rc.tax_treatment='explicit_vat_amount'
  where u.attendee_id=inv.attendee_id and coalesce(u.chargeable,true) and coalesce(u.quantity,0)>0;

  select coalesce(sum(net_amount+vat_amount),0) into base_net from public.invoice_lines where invoice_id=p_invoice_id;

  for adj in select * from public.invoice_adjustments where invoice_id=p_invoice_id and approved loop
    if adj.adjustment_type='percentage' then adj_amount := round(base_net * adj.value / 100,2); else adj_amount := round(adj.value,2); end if;
    if adj.direction='discount' then adj_amount := -abs(adj_amount); else adj_amount := abs(adj_amount); end if;
    insert into public.invoice_lines(invoice_id,attendee_id,source_type,source_id,description,quantity,unit_price,net_amount,vat_rate,vat_amount,gross_amount,rate_code)
    values(p_invoice_id,inv.attendee_id,'adjustment',adj.id,adj.description,1,adj_amount,adj_amount,0,0,adj_amount,null);
  end loop;

  update public.invoices i set
    net_total = x.net_total,
    vat_total = x.vat_total,
    gross_total = x.gross_total,
    updated_at = now()
  from (
    select coalesce(sum(net_amount),0) net_total, coalesce(sum(vat_amount),0) vat_total, coalesce(sum(gross_amount),0) gross_total
    from public.invoice_lines where invoice_id=p_invoice_id
  ) x
  where i.id=p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_invoice_status_service(p_invoice_id uuid, p_status text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old text; v_gross numeric; v_event uuid; v_type text; v_org uuid; v_terms integer; v_po text; v_payment_link text;
  v_addr_exception boolean; v_po_required boolean; v_addr1 text; v_town text; v_postcode text; v_country text;
  v_billing_confirmed boolean; v_issuer_name text; v_issuer_address text; v_payment_instructions text;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  if p_status not in ('draft','awaiting_billing_update','ready_for_review','approved','issued','paid','cancelled','void') then raise exception 'Invalid invoice status'; end if;
  select status,gross_total,event_id,invoice_type,billing_account_organisation_id,coalesce(payment_terms_days,14),purchase_order_reference,payment_link,billing_address_exception_approved
  into v_old,v_gross,v_event,v_type,v_org,v_terms,v_po,v_payment_link,v_addr_exception
  from public.invoices where id=p_invoice_id for update;
  if v_old is null then raise exception 'Invoice not found'; end if;
  if v_old='paid' and p_status<>'paid' then raise exception 'Paid invoice status cannot be changed'; end if;
  if v_old='void' and p_status<>'void' then raise exception 'Void invoice status cannot be changed'; end if;
  if v_old='cancelled' and p_status<>'cancelled' then raise exception 'Cancelled invoice status cannot be changed'; end if;
  if v_old='issued' and p_status not in ('issued','paid','void') then raise exception 'Issued invoices may only be marked paid or void'; end if;

  if p_status='approved' then
    if v_old<>'ready_for_review' then raise exception 'Invoice must be ready for review before approval'; end if;
    if not exists(select 1 from public.invoice_lines where invoice_id=p_invoice_id) then raise exception 'Cannot approve an invoice with no lines'; end if;
    if exists(select 1 from public.invoice_lines il left join public.rate_card rc on rc.event_id=v_event and rc.rate_code=il.rate_code where il.invoice_id=p_invoice_id and il.rate_code is not null and (rc.id is null or rc.status<>'approved')) then
      raise exception 'All rates used by the invoice must be approved before invoice approval';
    end if;
  end if;

  if p_status='issued' then
    if v_old<>'approved' then raise exception 'Invoice must be approved before issue'; end if;
    select billing_configuration_confirmed,invoice_issuer_name,invoice_issuer_address,invoice_payment_instructions
    into v_billing_confirmed,v_issuer_name,v_issuer_address,v_payment_instructions from public.events where id=v_event;
    if not coalesce(v_billing_confirmed,false) then raise exception 'Event invoice issuer configuration has not been confirmed'; end if;
    if nullif(trim(coalesce(v_issuer_name,'')),'') is null or nullif(trim(coalesce(v_issuer_address,'')),'') is null then raise exception 'Invoice issuer name and address must be configured before issue'; end if;
    if nullif(trim(coalesce(v_payment_link,'')),'') is null and nullif(trim(coalesce(v_payment_instructions,'')),'') is null then raise exception 'A payment link or event payment instructions are required before issue'; end if;
    if v_type='consolidated_company' then
      select purchase_order_required,billing_address_1,town_city,postcode,country into v_po_required,v_addr1,v_town,v_postcode,v_country from public.organisations where id=v_org;
      if v_org is null then raise exception 'Consolidated invoice has no billing organisation'; end if;
      if (nullif(trim(coalesce(v_addr1,'')),'') is null or nullif(trim(coalesce(v_town,'')),'') is null or nullif(trim(coalesce(v_postcode,'')),'') is null or nullif(trim(coalesce(v_country,'')),'') is null) and not coalesce(v_addr_exception,false) then
        raise exception 'Billing organisation address is incomplete; complete it or record an authorised billing-address exception';
      end if;
      if coalesce(v_po_required,false) and nullif(trim(coalesce(v_po,'')),'') is null then raise exception 'A purchase order reference is required for this billing organisation'; end if;
    end if;
  end if;
  if p_status='paid' and v_old<>'issued' then raise exception 'Invoice must be issued before payment'; end if;

  update public.invoices set status=p_status,
    issue_date=case when p_status='issued' and issue_date is null then current_date else issue_date end,
    due_date=case when p_status='issued' and due_date is null then current_date+coalesce(v_terms,14) else due_date end,
    paid_at=case when p_status='paid' and paid_at is null then now() else paid_at end,
    updated_at=now()
  where id=p_invoice_id;
  if p_status='paid' and not exists(select 1 from public.payments where invoice_id=p_invoice_id) then
    insert into public.payments(invoice_id,payment_method,amount,paid_at,notes) values(p_invoice_id,'manual',coalesce(v_gross,0),now(),'Marked paid via ISSSC Finance workflow');
  end if;
  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_stay_period_service(p_attendee_id uuid, p_actual_check_in date, p_actual_check_out date, p_billing_from date, p_billing_to date, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_id uuid; v_event uuid; begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations','finance']);
  select event_id into v_event from public.attendees where id=p_attendee_id;
  if v_event is null then raise exception 'Attendee not found'; end if;
  if p_actual_check_in is not null and p_actual_check_out is not null and p_actual_check_out<=p_actual_check_in then raise exception 'Invalid stay dates'; end if;
  if p_billing_from is not null and p_billing_to is not null and p_billing_to<=p_billing_from then raise exception 'Invalid billing dates'; end if;
  insert into public.stay_charge_periods(attendee_id,actual_check_in,actual_check_out,billing_from,billing_to,protocol_confirmed,charge_segment_type)
  values(p_attendee_id,p_actual_check_in,p_actual_check_out,p_billing_from,p_billing_to,false,'accommodation')
  returning id into v_id;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_invoice_adjustment_service(p_invoice_id uuid, p_attendee_id uuid, p_adjustment_type text, p_direction text, p_description text, p_value numeric, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_id uuid; v_status text; begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  if p_adjustment_type not in ('fixed','percentage') then raise exception 'Invalid adjustment type'; end if;
  if p_direction not in ('discount','increase') then raise exception 'Invalid adjustment direction'; end if;
  if p_value is null or p_value<0 then raise exception 'Adjustment value must be zero or greater'; end if;
  if p_adjustment_type='percentage' and p_value>100 then raise exception 'Percentage adjustment cannot exceed 100'; end if;
  select status into v_status from public.invoices where id=p_invoice_id;
  if v_status is null then raise exception 'Invoice not found'; end if;
  if v_status in ('approved','issued','paid','void','cancelled') then raise exception 'Adjustments can only be added before invoice approval'; end if;
  insert into public.invoice_adjustments(invoice_id,attendee_id,adjustment_type,direction,description,value,approved,approved_by,approved_at,notes)
  values(p_invoice_id,p_attendee_id,p_adjustment_type,p_direction,trim(p_description),p_value,true,p_actor_id,now(),'Approved at creation by Finance workflow')
  returning id into v_id;
  if (select invoice_type from public.invoices where id=p_invoice_id)='individual' then
    perform public.rebuild_individual_invoice(p_invoice_id);
  else
    perform public.rebuild_consolidated_invoice(p_invoice_id);
  end if;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_rate_service(p_rate_id uuid, p_unit_price numeric, p_status text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_event uuid;
  v_category text;
  v_code text;
  v_ok boolean;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  if p_unit_price is null or p_unit_price<0 then raise exception 'Rate must be zero or greater'; end if;
  if p_status not in ('proposed','approved','inactive') then raise exception 'Invalid rate status'; end if;

  select event_id,charge_category,rate_code into v_event,v_category,v_code from public.rate_card where id=p_rate_id;
  if v_event is null then raise exception 'Rate not found'; end if;

  if p_status='approved' then
    select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='CONF-27-RATES' and status='confirmed') into v_ok;
    if not v_ok then raise exception 'Formal event rate-card confirmation is required before rate approval'; end if;

    select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='C07' and status in ('confirmed','not_applicable')) into v_ok;
    if not v_ok then raise exception 'Tax treatment confirmation is required before rate approval'; end if;

    if v_category='lesson' then
      select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='C12' and status='confirmed') into v_ok;
      if not v_ok then raise exception 'Lesson-price confirmation is required before approving lesson rates'; end if;
    elsif v_category='transfer' then
      select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='C13' and status='confirmed') into v_ok;
      if not v_ok then raise exception 'Transfer charging-unit confirmation is required before approving transfer rates'; end if;
    elsif v_category='dinner' then
      select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='C14' and status='confirmed') into v_ok;
      if not v_ok then raise exception 'Dinner charging-model confirmation is required before approving dinner rates'; end if;
    elsif v_category='accommodation' then
      select exists(select 1 from public.event_configuration_items where event_id=v_event and item_code='C15' and status='confirmed') into v_ok;
      if not v_ok then raise exception 'Accommodation-inclusions confirmation is required before approving accommodation rates'; end if;
    end if;
  end if;

  update public.rate_card
  set unit_price=p_unit_price,status=p_status,active=(p_status<>'inactive'),updated_at=now()
  where id=p_rate_id;
  return p_rate_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.assign_stay_service(p_stay_id uuid, p_location_id uuid, p_room_type_id uuid, p_billing_from date, p_billing_to date, p_rate_code text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_rate numeric; v_event uuid; v_rate_location uuid; v_rate_room uuid;
  v_start date; v_mid date; v_end date; v_package text; v_exception boolean;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations','finance']);
  select a.event_id,s.approved_exception into v_event,v_exception
  from public.stay_charge_periods s join public.attendees a on a.id=s.attendee_id where s.id=p_stay_id;
  if v_event is null then raise exception 'Stay not found'; end if;
  if p_billing_from is null or p_billing_to is null or p_billing_to<=p_billing_from then raise exception 'Invalid billing dates'; end if;

  select rc.unit_price,rc.location_id,rc.room_type_id into v_rate,v_rate_location,v_rate_room
  from public.rate_card rc where rc.event_id=v_event and rc.rate_code=p_rate_code and rc.active=true
  order by case when rc.status='approved' then 0 else 1 end,rc.updated_at desc limit 1;
  if v_rate is null then raise exception 'Rate code not found'; end if;
  if v_rate_location is not null and v_rate_location is distinct from p_location_id then raise exception 'Rate does not match assigned accommodation'; end if;
  if v_rate_room is not null and v_rate_room is distinct from p_room_type_id then raise exception 'Rate does not match assigned room or charging role'; end if;

  select start_date,midweek_changeover_date,end_date into v_start,v_mid,v_end from public.events where id=v_event;
  v_package := case
    when p_billing_from=v_start and p_billing_to=v_end then 'full_week'
    when v_mid is not null and p_billing_from=v_start and p_billing_to=v_mid then 'first_half'
    when v_mid is not null and p_billing_from=v_mid and p_billing_to=v_end then 'second_half'
    else 'custom'
  end;
  if v_package='custom' and not coalesce(v_exception,false) then raise exception 'Custom billing dates require an approved package exception'; end if;

  update public.stay_charge_periods
  set location_id=p_location_id,room_type_id=p_room_type_id,billing_from=p_billing_from,billing_to=p_billing_to,
      package_type=v_package,rate_code=p_rate_code,unit_rate=v_rate,protocol_confirmed=true,updated_at=now()
  where id=p_stay_id;
  return p_stay_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_active_event_service(p_event_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin']);
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  update public.events set active=false,updated_at=now() where active=true and id<>p_event_id;
  update public.events set active=true,updated_at=now() where id=p_event_id;
  return p_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_usage_exception_service(p_usage_id uuid, p_approved boolean, p_reason text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance','protocol']);
  if coalesce(p_approved,false) and nullif(trim(p_reason),'') is null then
    raise exception 'An approved usage exception requires a reason';
  end if;
  update public.usage_extras
  set approved_exception=coalesce(p_approved,false),
      exception_reason=case when coalesce(p_approved,false) then nullif(trim(p_reason),'') else null end,
      exception_approved_by=case when coalesce(p_approved,false) then p_actor_id else null end,
      exception_approved_at=case when coalesce(p_approved,false) then now() else null end,
      updated_at=now()
  where id=p_usage_id;
  if not found then raise exception 'Usage record not found'; end if;
  return p_usage_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.guard_last_active_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op='DELETE' then
    if old.app_role='admin' and old.active and not exists(select 1 from public.profiles p where p.id<>old.id and p.app_role='admin' and p.active) then
      raise exception 'Cannot remove the last active administrator';
    end if;
    return old;
  end if;
  if old.app_role='admin' and old.active and (new.app_role<>'admin' or not new.active) and not exists(select 1 from public.profiles p where p.id<>old.id and p.app_role='admin' and p.active) then
    raise exception 'Cannot deactivate or demote the last active administrator';
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.suppress_usage_from_invoice(p_usage_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
  select exists(
    select 1
    from public.usage_extras u
    join public.attendees a on a.id=u.attendee_id
    join public.stay_charge_periods s on s.attendee_id=u.attendee_id
    join public.rate_card rc on rc.event_id=a.event_id and rc.rate_code=s.rate_code and rc.active
    where u.id=p_usage_id
      and lower(u.category)='dinner'
      and coalesce(u.approved_exception,false)=false
      and u.usage_date is not null
      and coalesce(s.protocol_confirmed,false)=true
      and rc.includes_dinner=true
      and u.usage_date >= coalesce(s.billing_from,s.actual_check_in)
      and u.usage_date < coalesce(s.billing_to,s.actual_check_out)
  );
$function$
;
CREATE OR REPLACE FUNCTION private.suppress_duplicate_usage_line()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  if new.source_type in ('usage','usage_vat')
     and new.source_id is not null
     and private.suppress_usage_from_invoice(new.source_id) then
    return null;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_transfer_billing_service(p_travel_id uuid, p_reviewed boolean, p_notes text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_chargeable boolean;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance','protocol']);
  select transfer_chargeable into v_chargeable from public.travel_records where id=p_travel_id;
  if not found then raise exception 'Travel record not found'; end if;
  if coalesce(p_reviewed,false) and coalesce(v_chargeable,false) and nullif(trim(p_notes),'') is null then
    raise exception 'Chargeable transfer billing review requires a note describing the agreed treatment';
  end if;
  update public.travel_records
  set billing_reviewed=coalesce(p_reviewed,false),
      billing_review_notes=case when coalesce(p_reviewed,false) then nullif(trim(p_notes),'') else null end,
      billing_reviewed_by=case when coalesce(p_reviewed,false) then p_actor_id else null end,
      billing_reviewed_at=case when coalesce(p_reviewed,false) then now() else null end,
      updated_at=now()
  where id=p_travel_id;
  return p_travel_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_lift_pass_service(p_lift_pass_id uuid, p_required boolean, p_start_date date, p_end_date date, p_carre_neige_required boolean, p_chargeable boolean, p_rate_code text, p_protocol_confirmed boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_event uuid; v_year integer; v_rate numeric; v_category text; v_code text;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations']);
  select a.event_id,e.event_year into v_event,v_year from public.lift_passes l join public.attendees a on a.id=l.attendee_id join public.events e on e.id=a.event_id where l.id=p_lift_pass_id;
  if v_event is null then raise exception 'Lift pass not found'; end if;
  if coalesce(p_required,false) then
    if p_start_date is null or p_end_date is null or p_end_date<p_start_date then raise exception 'Valid lift-pass dates are required'; end if;
    v_code:=nullif(trim(p_rate_code),'');
    if coalesce(p_chargeable,true) then
      if v_code is null then v_code:=v_year::text||case when coalesce(p_carre_neige_required,true) then '_LIFT_CARRE' else '_LIFT_STANDARD' end; end if;
      select unit_price,charge_category into v_rate,v_category from public.rate_card where event_id=v_event and rate_code=v_code and active=true order by case when status='approved' then 0 else 1 end,updated_at desc limit 1;
      if v_rate is null then raise exception 'Lift-pass rate not found'; end if;
      if v_category<>'lift_pass' then raise exception 'Selected rate is not a lift-pass rate'; end if;
    else v_rate:=0; v_code:=null; end if;
  else v_rate:=0; v_code:=null; end if;
  update public.lift_passes set required=coalesce(p_required,false),start_date=case when coalesce(p_required,false) then p_start_date else null end,end_date=case when coalesce(p_required,false) then p_end_date else null end,carre_neige_required=coalesce(p_carre_neige_required,true),chargeable=case when coalesce(p_required,false) then coalesce(p_chargeable,true) else false end,rate_code=v_code,unit_rate=v_rate,protocol_confirmed=coalesce(p_protocol_confirmed,false),updated_at=now() where id=p_lift_pass_id;
  return p_lift_pass_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.add_usage_charge_service(p_attendee_id uuid, p_usage_date date, p_rate_code text, p_quantity numeric, p_notes text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_rate numeric;
  v_cat text;
  v_tax text;
  v_event uuid;
  v_id uuid;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations','finance']);
  select event_id into v_event from public.attendees where id=p_attendee_id;
  if v_event is null then raise exception 'Attendee not found'; end if;
  if p_quantity is null or p_quantity<=0 then raise exception 'Quantity must be greater than zero'; end if;

  select unit_price,charge_category,tax_treatment into v_rate,v_cat,v_tax
  from public.rate_card
  where event_id=v_event and rate_code=p_rate_code and active=true
  order by case when status='approved' then 0 else 1 end,updated_at desc limit 1;
  if v_rate is null then raise exception 'Rate code not found'; end if;
  if v_cat in ('accommodation','lift_pass') then raise exception 'This rate must be recorded through its dedicated workflow'; end if;
  if v_tax='explicit_vat_amount' then raise exception 'Explicit VAT component rates are generated automatically and cannot be added as usage'; end if;

  if v_cat='dinner' and p_usage_date is null then raise exception 'A dinner charge requires a date'; end if;

  if v_cat='transfer' then
    if not exists(select 1 from public.travel_records where attendee_id=p_attendee_id and transfer_chargeable and billing_reviewed) then
      raise exception 'Transfer billing must be reviewed before adding the transfer charge';
    end if;
    if exists(select 1 from public.usage_extras where attendee_id=p_attendee_id and chargeable and category='transfer') then
      raise exception 'A transfer-inclusive charge already exists for this attendee';
    end if;
    if exists(select 1 from public.usage_extras where attendee_id=p_attendee_id and chargeable and category='admin') then
      raise exception 'Transfer-inclusive charge cannot be combined with an existing admin-only charge';
    end if;
  end if;

  if v_cat='admin' then
    if exists(select 1 from public.usage_extras where attendee_id=p_attendee_id and chargeable and category='transfer') then
      raise exception 'Admin-only charge cannot be combined with an existing transfer-inclusive charge';
    end if;
    if exists(select 1 from public.usage_extras where attendee_id=p_attendee_id and chargeable and category='admin') then
      raise exception 'An admin-only charge already exists for this attendee';
    end if;
  end if;

  insert into public.usage_extras(attendee_id,usage_date,category,quantity,rate_code,unit_rate,chargeable,notes,recorded_by)
  values(p_attendee_id,p_usage_date,coalesce(v_cat,p_rate_code),p_quantity,p_rate_code,v_rate,true,nullif(trim(p_notes),''),p_actor_id)
  returning id into v_id;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.calculate_lift_pass_charge()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare r public.rate_card; v_year integer;
begin
  if new.required is false then
    new.pass_days := 0;
    new.total_charge := 0;
    return new;
  end if;
  if new.start_date is not null and new.end_date is not null then
    new.pass_days := greatest(0,(new.end_date-new.start_date)+1);
  end if;
  if new.rate_code is null then
    select e.event_year into v_year
    from public.attendees a join public.events e on e.id=a.event_id
    where a.id=new.attendee_id;
    if v_year is null then raise exception 'Unable to determine attendee event year'; end if;
    new.rate_code := v_year::text||case when coalesce(new.carre_neige_required,true) then '_LIFT_CARRE' else '_LIFT_STANDARD' end;
  end if;
  select * into r from public.find_event_rate(new.attendee_id,new.rate_code);
  if r.id is null then raise exception 'No active event rate found for %',new.rate_code; end if;
  new.unit_rate := r.unit_price;
  new.total_charge := case when coalesce(new.chargeable,true) then round((coalesce(new.pass_days,0)*r.unit_price)::numeric,2) else 0 end;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_event_rollover_service(p_source_event_id uuid, p_event_year integer, p_start_date date, p_midweek_changeover_date date, p_end_date date, p_attendance_deadline date, p_make_active boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  src public.events%rowtype;
  v_event_id uuid;
  v_name text;
  v_prefix text;
begin
  perform private.require_actor_role(p_actor_id,array['admin']);
  select * into src from public.events where id=p_source_event_id;
  if src.id is null then raise exception 'Source event not found'; end if;
  if p_event_year is null or p_event_year<extract(year from current_date)::int then raise exception 'Invalid event year'; end if;
  if p_start_date is null or p_end_date is null or p_end_date<=p_start_date then raise exception 'Invalid event dates'; end if;
  if p_midweek_changeover_date is not null and (p_midweek_changeover_date<=p_start_date or p_midweek_changeover_date>=p_end_date) then raise exception 'Changeover date must fall within event dates'; end if;
  if p_attendance_deadline is not null and p_attendance_deadline>p_start_date then raise exception 'Attendance deadline must be on or before event start'; end if;
  if exists(select 1 from public.events where event_year=p_event_year) then raise exception 'An event already exists for this year'; end if;

  v_name:=regexp_replace(src.name,src.event_year::text||'$' ,p_event_year::text);
  if v_name=src.name then v_name:='Inter Service Snow Sports Championships '||p_event_year::text; end if;
  v_prefix:='ISSSC'||p_event_year::text;

  if coalesce(p_make_active,false) then update public.events set active=false,updated_at=now() where active=true; end if;

  insert into public.events(name,event_year,start_date,midweek_changeover_date,end_date,attendance_deadline,invoice_prefix,default_lift_pass_type,currency,active,notes)
  values(v_name,p_event_year,p_start_date,p_midweek_changeover_date,p_end_date,p_attendance_deadline,v_prefix,src.default_lift_pass_type,src.currency,coalesce(p_make_active,false),'Created from ISSSC '||src.event_year||' template')
  returning id into v_event_id;

  insert into public.rate_card(event_id,rate_code,charge_category,location_id,room_type_id,description,unit,unit_price,vat_rate,tax_treatment,status,effective_from,effective_to,active,source_note,paired_rate_code,board_basis,includes_dinner)
  select v_event_id,
         replace(rate_code,src.event_year::text,p_event_year::text),
         charge_category,location_id,room_type_id,description,unit,unit_price,vat_rate,tax_treatment,'proposed',p_start_date,p_end_date,true,
         'Carried forward from ISSSC '||src.event_year||'; review and approve for '||p_event_year,
         case when paired_rate_code is null then null else replace(paired_rate_code,src.event_year::text,p_event_year::text) end,
         board_basis,includes_dinner
  from public.rate_card where event_id=src.id and active=true;

  insert into public.event_sponsors(event_id,organisation_id,sponsor_status,room_allocation,race_funding_sponsor,consolidated_invoice_requested,package_notes,active,sponsor_tier,display_in_event_app,protocol_rep_allowance,sponsor_manager_notes)
  select v_event_id,organisation_id,'invited',room_allocation,race_funding_sponsor,consolidated_invoice_requested,package_notes,true,sponsor_tier,display_in_event_app,protocol_rep_allowance,'Carried forward from ISSSC '||src.event_year
  from public.event_sponsors where event_id=src.id and active=true
  on conflict (event_id,organisation_id) do nothing;

  insert into public.sponsor_contacts(organisation_id,event_id,first_name,surname,job_title,email,mobile,primary_contact,billing_contact,active,notes)
  select organisation_id,v_event_id,first_name,surname,job_title,email,mobile,primary_contact,billing_contact,true,'Carried forward from ISSSC '||src.event_year
  from public.sponsor_contacts where event_id=src.id and active=true;

  return v_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_lift_pass_service(p_attendee_id uuid, p_required boolean, p_start_date date, p_end_date date, p_carre_neige_required boolean, p_chargeable boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_id uuid; v_event uuid;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations']);
  select event_id into v_event from public.attendees where id=p_attendee_id;
  if v_event is null then raise exception 'Attendee not found'; end if;
  if coalesce(p_required,false) and (p_start_date is null or p_end_date is null or p_end_date<p_start_date) then raise exception 'Valid lift-pass dates are required'; end if;
  insert into public.lift_passes(attendee_id,required,pass_type,start_date,end_date,carre_neige_required,chargeable,protocol_confirmed)
  select p_attendee_id,coalesce(p_required,false),coalesce(e.default_lift_pass_type,'3V'),p_start_date,p_end_date,coalesce(p_carre_neige_required,true),coalesce(p_chargeable,true),false
  from public.events e where e.id=v_event
  returning id into v_id;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_invoice_billing_metadata_service(p_invoice_id uuid, p_purchase_order_reference text, p_payment_link text, p_due_date date, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_status text;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  select status into v_status from public.invoices where id=p_invoice_id for update;
  if v_status is null then raise exception 'Invoice not found'; end if;
  if v_status in ('issued','paid','void') then raise exception 'Issued, paid or void invoice metadata is immutable'; end if;
  update public.invoices set
    purchase_order_reference=nullif(trim(p_purchase_order_reference),''),
    payment_link=nullif(trim(p_payment_link),''),
    due_date=p_due_date,
    updated_at=now()
  where id=p_invoice_id;
  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_attendee_relationship_service(p_attendee_id uuid, p_participation_status text, p_linked_main_attendee_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_event uuid; v_main_event uuid;
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations']);
  if p_participation_status not in ('participant','non_attending_companion') then raise exception 'Invalid participation status'; end if;
  select event_id into v_event from public.attendees where id=p_attendee_id;
  if v_event is null then raise exception 'Attendee not found'; end if;
  if p_participation_status='non_attending_companion' then
    if p_linked_main_attendee_id is null then raise exception 'A non-attending companion must be linked to a main attendee'; end if;
    if p_linked_main_attendee_id=p_attendee_id then raise exception 'An attendee cannot be linked to themselves'; end if;
    select event_id into v_main_event from public.attendees where id=p_linked_main_attendee_id;
    if v_main_event is distinct from v_event then raise exception 'Linked attendee must belong to the same event'; end if;
  end if;
  update public.attendees
  set participation_status=p_participation_status,
      linked_main_attendee_id=case when p_participation_status='non_attending_companion' then p_linked_main_attendee_id else null end,
      updated_at=now()
  where id=p_attendee_id;
  return p_attendee_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_travel_record_service(p_travel_id uuid, p_method_of_transport text, p_airport_station text, p_flight_travel_number text, p_travel_datetime timestamp with time zone, p_resort_datetime timestamp with time zone, p_transfer_requested boolean, p_transfer_service text, p_transfer_chargeable boolean, p_special_transfer_datetime timestamp with time zone, p_assignment_notes text, p_protocol_confirmed boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin','protocol','operations']);
  update public.travel_records t
  set method_of_transport=nullif(trim(p_method_of_transport),''),
      airport_station=nullif(trim(p_airport_station),''),
      flight_travel_number=nullif(trim(p_flight_travel_number),''),
      travel_datetime=p_travel_datetime,
      resort_datetime=p_resort_datetime,
      transfer_requested=p_transfer_requested,
      transfer_service=nullif(trim(p_transfer_service),''),
      transfer_chargeable=coalesce(p_transfer_chargeable,false),
      special_transfer_datetime=p_special_transfer_datetime,
      assignment_notes=nullif(trim(p_assignment_notes),''),
      protocol_confirmed=coalesce(p_protocol_confirmed,false),
      billing_reviewed=case when
        t.transfer_requested is distinct from p_transfer_requested
        or t.transfer_service is distinct from nullif(trim(p_transfer_service),'')
        or t.transfer_chargeable is distinct from coalesce(p_transfer_chargeable,false)
        or t.airport_station is distinct from nullif(trim(p_airport_station),'')
        or t.flight_travel_number is distinct from nullif(trim(p_flight_travel_number),'')
        or t.travel_datetime is distinct from p_travel_datetime
        then false else t.billing_reviewed end,
      billing_review_notes=case when
        t.transfer_requested is distinct from p_transfer_requested
        or t.transfer_service is distinct from nullif(trim(p_transfer_service),'')
        or t.transfer_chargeable is distinct from coalesce(p_transfer_chargeable,false)
        or t.airport_station is distinct from nullif(trim(p_airport_station),'')
        or t.flight_travel_number is distinct from nullif(trim(p_flight_travel_number),'')
        or t.travel_datetime is distinct from p_travel_datetime
        then null else t.billing_review_notes end,
      billing_reviewed_by=case when
        t.transfer_requested is distinct from p_transfer_requested
        or t.transfer_service is distinct from nullif(trim(p_transfer_service),'')
        or t.transfer_chargeable is distinct from coalesce(p_transfer_chargeable,false)
        or t.airport_station is distinct from nullif(trim(p_airport_station),'')
        or t.flight_travel_number is distinct from nullif(trim(p_flight_travel_number),'')
        or t.travel_datetime is distinct from p_travel_datetime
        then null else t.billing_reviewed_by end,
      billing_reviewed_at=case when
        t.transfer_requested is distinct from p_transfer_requested
        or t.transfer_service is distinct from nullif(trim(p_transfer_service),'')
        or t.transfer_chargeable is distinct from coalesce(p_transfer_chargeable,false)
        or t.airport_station is distinct from nullif(trim(p_airport_station),'')
        or t.flight_travel_number is distinct from nullif(trim(p_flight_travel_number),'')
        or t.travel_datetime is distinct from p_travel_datetime
        then null else t.billing_reviewed_at end,
      updated_at=now()
  where id=p_travel_id;
  if not found then raise exception 'Travel record not found'; end if;
  return p_travel_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.default_usage_rate_code(p_category text, p_event_year integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
 select p_event_year::text || case lower(coalesce(p_category,''))
   when 'champagne' then '_CHAMP_NET'
   when 'eterlou dinner' then '_DINNER_ETERLOU'
   when 'eterlou_dinner' then '_DINNER_ETERLOU'
   when 'tremplin dinner' then '_DINNER_TREMPLIN'
   when 'tremplin_dinner' then '_DINNER_TREMPLIN'
   when 'group lesson' then '_LESSON_GROUP'
   when 'group_lesson' then '_LESSON_GROUP'
   when 'private lesson' then '_LESSON_PRIVATE'
   when 'private_lesson' then '_LESSON_PRIVATE'
   when 'telemark lesson' then '_LESSON_TELEMARK'
   when 'telemark_lesson' then '_LESSON_TELEMARK'
   when 'admin only' then '_ADMIN_ONLY'
   when 'admin_only' then '_ADMIN_ONLY'
   when 'airport transfer' then '_TRANSFER_GVA'
   when 'airport_transfer' then '_TRANSFER_GVA'
   when 'moutiers transfer' then '_TRANSFER_MOUTIERS'
   when 'moutiers_transfer' then '_TRANSFER_MOUTIERS'
   else null end;
$function$
;
CREATE OR REPLACE FUNCTION public.default_usage_rate_code(p_attendee_id uuid, p_category text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_year integer; v_suffix text;
begin
  select e.event_year into v_year
  from public.attendees a join public.events e on e.id=a.event_id
  where a.id=p_attendee_id;
  if v_year is null then return null; end if;
  v_suffix := case lower(coalesce(p_category,''))
    when 'champagne' then 'CHAMP_NET'
    when 'eterlou dinner' then 'DINNER_ETERLOU'
    when 'eterlou_dinner' then 'DINNER_ETERLOU'
    when 'tremplin dinner' then 'DINNER_TREMPLIN'
    when 'tremplin_dinner' then 'DINNER_TREMPLIN'
    when 'group lesson' then 'LESSON_GROUP'
    when 'group_lesson' then 'LESSON_GROUP'
    when 'private lesson' then 'LESSON_PRIVATE'
    when 'private_lesson' then 'LESSON_PRIVATE'
    when 'telemark lesson' then 'LESSON_TELEMARK'
    when 'telemark_lesson' then 'LESSON_TELEMARK'
    when 'admin only' then 'ADMIN_ONLY'
    when 'admin_only' then 'ADMIN_ONLY'
    when 'airport transfer' then 'TRANSFER_GVA'
    when 'airport_transfer' then 'TRANSFER_GVA'
    when 'moutiers transfer' then 'TRANSFER_MOUTIERS'
    when 'moutiers_transfer' then 'TRANSFER_MOUTIERS'
    else null end;
  return case when v_suffix is null then null else v_year::text||'_'||v_suffix end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.default_usage_rate_code(p_category text)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
declare v_year integer; v_suffix text;
begin
  select event_year into v_year from public.events where active=true order by event_year desc limit 1;
  if v_year is null then return null; end if;
  v_suffix:=case lower(coalesce(p_category,''))
    when 'champagne' then 'CHAMP_NET'
    when 'eterlou dinner' then 'DINNER_ETERLOU'
    when 'eterlou_dinner' then 'DINNER_ETERLOU'
    when 'tremplin dinner' then 'DINNER_TREMPLIN'
    when 'tremplin_dinner' then 'DINNER_TREMPLIN'
    when 'group lesson' then 'LESSON_GROUP'
    when 'group_lesson' then 'LESSON_GROUP'
    when 'private lesson' then 'LESSON_PRIVATE'
    when 'private_lesson' then 'LESSON_PRIVATE'
    when 'telemark lesson' then 'LESSON_TELEMARK'
    when 'telemark_lesson' then 'LESSON_TELEMARK'
    when 'admin only' then 'ADMIN_ONLY'
    when 'admin_only' then 'ADMIN_ONLY'
    when 'airport transfer' then 'TRANSFER_GVA'
    when 'airport_transfer' then 'TRANSFER_GVA'
    when 'moutiers transfer' then 'TRANSFER_MOUTIERS'
    when 'moutiers_transfer' then 'TRANSFER_MOUTIERS'
    else null end;
  return case when v_suffix is null then null else v_year::text||'_'||v_suffix end;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.usage_charge_suppressed(p_usage_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce((
    select case
      when u.category='dinner'
       and not coalesce(u.approved_exception,false)
       and u.usage_date is not null
       and exists (
         select 1
         from public.stay_charge_periods s
         join public.attendees a on a.id=s.attendee_id
         join public.rate_card rc on rc.event_id=a.event_id and rc.rate_code=s.rate_code and rc.active
         where s.attendee_id=u.attendee_id
           and s.protocol_confirmed
           and rc.includes_dinner
           and s.billing_from is not null and s.billing_to is not null
           and u.usage_date>=s.billing_from and u.usage_date<s.billing_to
       )
      then true else false end
    from public.usage_extras u where u.id=p_usage_id
  ),false);
$function$
;
CREATE OR REPLACE FUNCTION public.guard_invoice_usage_line()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.source_type in ('usage','usage_vat') and new.source_id is not null and public.usage_charge_suppressed(new.source_id) then
    return null;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.flag_manual_billing_category()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if lower(coalesce(new.category,'')) in ('hrh','hrh party','other','other / international guest') then
    if tg_op='INSERT' or new.category is distinct from old.category then
      new.exception_flag:=true;
      new.exception_reason:=coalesce(nullif(new.exception_reason,''),'Manual billing review required for attendee category: '||new.category);
    end if;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_consolidated_invoice_inclusion_service(p_attendee_id uuid, p_included boolean, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_event uuid; v_org uuid;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  select event_id,billing_account_organisation_id into v_event,v_org from public.attendees where id=p_attendee_id for update;
  if v_event is null then raise exception 'Attendee not found'; end if;
  if exists(select 1 from public.invoices where event_id=v_event and billing_account_organisation_id=v_org and invoice_type='consolidated_company' and status in ('issued','paid')) then
    raise exception 'Consolidated invoice has already been issued for this billing organisation';
  end if;
  update public.attendees set consolidated_invoice_included=coalesce(p_included,true),updated_at=now() where id=p_attendee_id;
  update public.invoices set status='awaiting_billing_update',updated_at=now()
  where event_id=v_event and billing_account_organisation_id=v_org and invoice_type='consolidated_company' and status in ('ready_for_review','approved');
  return p_attendee_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.set_invoice_address_exception_service(p_invoice_id uuid, p_approved boolean, p_reason text, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_status text;
begin
  perform private.require_actor_role(p_actor_id,array['admin','finance']);
  select status into v_status from public.invoices where id=p_invoice_id for update;
  if v_status is null then raise exception 'Invoice not found'; end if;
  if v_status in ('issued','paid','void') then raise exception 'Issued, paid or void invoices cannot be changed'; end if;
  if coalesce(p_approved,false) and nullif(trim(p_reason),'') is null then raise exception 'An authorised billing-address exception requires a reason'; end if;
  update public.invoices set
    billing_address_exception_approved=coalesce(p_approved,false),
    billing_address_exception_reason=case when coalesce(p_approved,false) then nullif(trim(p_reason),'') else null end,
    billing_address_exception_approved_by=case when coalesce(p_approved,false) then p_actor_id else null end,
    billing_address_exception_approved_at=case when coalesce(p_approved,false) then now() else null end,
    updated_at=now()
  where id=p_invoice_id;
  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_event_config_service(p_event_id uuid, p_name text, p_start_date date, p_midweek_changeover_date date, p_end_date date, p_attendance_deadline date, p_invoice_prefix text, p_default_lift_pass_type text, p_currency text, p_payment_terms_days integer, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
begin
  perform private.require_actor_role(p_actor_id,array['admin']);
  if p_start_date is null or p_end_date is null or p_end_date<=p_start_date then raise exception 'Invalid event dates'; end if;
  if p_midweek_changeover_date is not null and (p_midweek_changeover_date<=p_start_date or p_midweek_changeover_date>=p_end_date) then raise exception 'Changeover date must fall within event dates'; end if;
  if p_attendance_deadline is not null and p_attendance_deadline>p_start_date then raise exception 'Attendance deadline must be on or before the event start date'; end if;
  if coalesce(p_payment_terms_days,14)<0 or coalesce(p_payment_terms_days,14)>365 then raise exception 'Payment terms must be between 0 and 365 days'; end if;

  update public.events
  set name=coalesce(nullif(trim(p_name),''),name),
      start_date=p_start_date,
      midweek_changeover_date=p_midweek_changeover_date,
      end_date=p_end_date,
      attendance_deadline=p_attendance_deadline,
      invoice_prefix=coalesce(nullif(trim(p_invoice_prefix),''),invoice_prefix),
      default_lift_pass_type=nullif(trim(p_default_lift_pass_type),''),
      currency=coalesce(nullif(trim(p_currency),''),'GBP'),
      payment_terms_days=coalesce(p_payment_terms_days,14),
      updated_at=now()
  where id=p_event_id;
  if not found then raise exception 'Event not found'; end if;
  return p_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.seed_event_configuration_items()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_source_event uuid;
begin
  select id into v_source_event
  from public.events
  where event_year < new.event_year
  order by event_year desc
  limit 1;

  if v_source_event is not null then
    insert into public.event_configuration_items(event_id,item_code,title,description,status)
    select new.id,item_code,title,description,'pending'
    from public.event_configuration_items
    where event_id=v_source_event
    on conflict(event_id,item_code) do nothing;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.sync_profile_attendee_from_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status='accepted' and new.user_id is not null and new.attendee_id is not null then
    update public.profiles
    set attendee_id=new.attendee_id,updated_at=now()
    where id=new.user_id;

    insert into public.user_attendee_links(user_id,attendee_id,event_id,link_source)
    values(new.user_id,new.attendee_id,new.event_id,'accepted_booking')
    on conflict do nothing;
  end if;
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_protocol_lift_pass(p_attendee_id uuid, p_lift_pass_id uuid, p_required boolean, p_start_date date, p_end_date date, p_carre_neige_required boolean, p_chargeable boolean, p_rate_code text, p_protocol_confirmed boolean, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_lift_pass_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'protocol', 'operations']);

  if not exists (select 1 from public.attendees a where a.id = p_attendee_id) then
    raise exception 'Attendee not found';
  end if;

  if p_lift_pass_id is not null then
    select l.id into v_lift_pass_id
    from public.lift_passes l
    where l.id = p_lift_pass_id and l.attendee_id = p_attendee_id
    for update;

    if v_lift_pass_id is null then
      raise exception 'Lift pass not found for this attendee';
    end if;
  else
    select l.id into v_lift_pass_id
    from public.lift_passes l
    where l.attendee_id = p_attendee_id
    order by l.created_at
    limit 1
    for update;
  end if;

  if v_lift_pass_id is null then
    v_lift_pass_id := public.create_lift_pass_service(
      p_attendee_id,
      p_required,
      p_start_date,
      p_end_date,
      p_carre_neige_required,
      p_chargeable,
      v_actor_id
    );
  end if;

  perform public.update_lift_pass_service(
    v_lift_pass_id,
    p_required,
    p_start_date,
    p_end_date,
    p_carre_neige_required,
    p_chargeable,
    p_rate_code,
    p_protocol_confirmed,
    v_actor_id
  );

  update public.lift_passes
  set notes = nullif(trim(p_notes), ''),
      updated_at = now()
  where id = v_lift_pass_id;

  return v_lift_pass_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.update_attendee_core(p_attendee_id uuid, p_attendance_status text, p_category text, p_display_company text, p_title_rank text, p_first_name text, p_surname text, p_known_as text, p_post_nominals text, p_email text, p_mobile text, p_service text, p_discipline text, p_position_role text, p_dietary_requirements text, p_date_of_birth date, p_equipment_hire_required boolean, p_boot_size text, p_attendee_notes text, p_protocol_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not private.has_staff_role(array['admin', 'protocol', 'operations']) then
    raise exception 'You are not authorised to update attendee records' using errcode = '42501';
  end if;

  if p_attendance_status not in ('expected', 'confirmed', 'declined', 'cancelled') then
    raise exception 'Invalid attendance status';
  end if;

  if nullif(trim(p_category), '') is null then
    raise exception 'Category is required';
  end if;

  if nullif(trim(p_first_name), '') is null or nullif(trim(p_surname), '') is null then
    raise exception 'First name and surname are required';
  end if;

  update public.attendees
  set attendance_status = p_attendance_status,
      category = trim(p_category),
      display_company = nullif(trim(p_display_company), ''),
      title_rank = nullif(trim(p_title_rank), ''),
      first_name = trim(p_first_name),
      surname = trim(p_surname),
      known_as = nullif(trim(p_known_as), ''),
      post_nominals = nullif(trim(p_post_nominals), ''),
      email = lower(nullif(trim(p_email), '')),
      mobile = nullif(trim(p_mobile), ''),
      service = nullif(trim(p_service), ''),
      discipline = nullif(trim(p_discipline), ''),
      position_role = nullif(trim(p_position_role), ''),
      dietary_requirements = nullif(trim(p_dietary_requirements), ''),
      date_of_birth = p_date_of_birth,
      equipment_hire_required = coalesce(p_equipment_hire_required, false),
      boot_size = nullif(trim(p_boot_size), ''),
      attendee_notes = nullif(trim(p_attendee_notes), ''),
      protocol_notes = nullif(trim(p_protocol_notes), ''),
      data_checked = false,
      checked_by = null,
      checked_at = null
  where id = p_attendee_id;

  if not found then
    raise exception 'Attendee not found';
  end if;

  return p_attendee_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_sponsor_invitation(p_event_sponsor_id uuid, p_invitee_email text, p_invitee_name text, p_category text, p_role_position text, p_primary_representative boolean, p_counts_against_room_allocation boolean, p_intended_package text, p_notes text)
 RETURNS TABLE(invitation_id uuid, invitation_token uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_organisation_id uuid;
  v_invitation_id uuid;
  v_invitation_token uuid;
  v_email text := nullif(lower(trim(p_invitee_email)), '');
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'sponsor_manager']);

  select es.event_id, es.organisation_id
  into v_event_id, v_organisation_id
  from public.event_sponsors es
  where es.id = p_event_sponsor_id and es.active;

  if v_event_id is null then
    raise exception 'Active sponsor record not found';
  end if;

  if v_email is null or position('@' in v_email) < 2 then
    raise exception 'A valid invitee email address is required';
  end if;

  insert into public.invitations (
    event_id,
    organisation_id,
    invitee_email,
    invitee_name,
    category,
    invitation_status,
    notes,
    role_position,
    primary_representative,
    counts_against_room_allocation,
    intended_package
  ) values (
    v_event_id,
    v_organisation_id,
    v_email,
    nullif(trim(p_invitee_name), ''),
    coalesce(nullif(trim(p_category), ''), 'Sponsor Guest'),
    'pending',
    nullif(trim(p_notes), ''),
    nullif(trim(p_role_position), ''),
    coalesce(p_primary_representative, false),
    coalesce(p_counts_against_room_allocation, true),
    nullif(trim(p_intended_package), '')
  ) returning id, public.invitations.invitation_token
    into v_invitation_id, v_invitation_token;

  return query select v_invitation_id, v_invitation_token;
exception
  when unique_violation then
    raise exception 'An invitation already exists for this email address and event';
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_intake_submission(p_submission_id uuid, p_decision text, p_review_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_submission public.intake_submissions%rowtype;
  v_attendee_id uuid;
  v_payload jsonb;
  v_date_of_birth date;
  v_email text;
  v_manual_match_count integer := 0;
  v_linked_manual boolean := false;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform private.require_actor_role(v_actor_id,array['admin','protocol','operations']);

  if p_decision not in ('accepted','review_required','rejected') then
    raise exception 'Invalid review decision';
  end if;

  select * into v_submission
  from public.intake_submissions
  where id=p_submission_id
  for update;
  if not found then raise exception 'Registration not found'; end if;

  if v_submission.processing_status='accepted' then
    if p_decision='accepted' and v_submission.mapped_attendee_id is not null then
      return jsonb_build_object(
        'submission_id',v_submission.id,'decision',v_submission.processing_status,
        'attendee_id',v_submission.mapped_attendee_id,'linked_manual',false
      );
    end if;
    raise exception 'An accepted registration cannot be changed';
  end if;

  if p_decision='accepted' then
    v_payload:=v_submission.raw_payload;
    if nullif(trim(v_payload->>'first_name'),'') is null
       or nullif(trim(v_payload->>'surname'),'') is null then
      raise exception 'First name and surname are required before approval';
    end if;
    if coalesce(v_payload->>'date_of_birth','') ~ '^\d{4}-\d{2}-\d{2}$' then
      v_date_of_birth:=(v_payload->>'date_of_birth')::date;
    end if;
    v_email:=nullif(lower(trim(coalesce(v_submission.attendee_email,''))),'');

    if v_email is not null then
      select count(*),(array_agg(a.id order by a.created_at,a.id))[1]
      into v_manual_match_count,v_attendee_id
      from public.attendees a
      where a.event_id=v_submission.event_id
        and a.record_source='protocol_manual'
        and lower(a.email)=v_email
        and not exists(
          select 1 from public.intake_submissions linked
          where linked.mapped_attendee_id=a.id and linked.processing_status='accepted'
        );
      if v_manual_match_count>1 then
        raise exception 'More than one manual person uses this email. Resolve the duplicate before accepting the registration.';
      end if;
    end if;

    if v_manual_match_count=1 then
      update public.attendees set
        invitation_id=coalesce(v_submission.invitation_id,invitation_id),
        attendance_status='expected',
        category=coalesce(nullif(trim(v_payload->>'category'),''),category,'Other'),
        display_company=coalesce(nullif(trim(v_payload->>'sponsor_name'),''),display_company),
        title_rank=coalesce(nullif(trim(v_payload->>'title_rank'),''),title_rank),
        first_name=trim(v_payload->>'first_name'),surname=trim(v_payload->>'surname'),
        post_nominals=coalesce(nullif(trim(v_payload->>'post_nominals'),''),post_nominals),
        email=v_email,mobile=coalesce(nullif(trim(v_payload->>'mobile'),''),mobile),
        service=coalesce(nullif(trim(v_payload->>'service'),''),service),
        discipline=coalesce(nullif(trim(v_payload->>'discipline'),''),discipline),
        position_role=coalesce(nullif(trim(v_payload->>'role'),''),position_role),
        dietary_requirements=coalesce(nullif(trim(v_payload->>'dietary_requirements'),''),dietary_requirements),
        date_of_birth=coalesce(v_date_of_birth,date_of_birth),
        equipment_hire_required=coalesce((v_payload->>'equipment_hire_required')::boolean,equipment_hire_required,false),
        boot_size=coalesce(nullif(trim(v_payload->>'boot_size'),''),boot_size),
        attendee_notes=coalesce(nullif(trim(v_payload->>'other_information'),''),attendee_notes),
        data_checked=false,checked_by=null,checked_at=null,
        source_last_updated_at=v_submission.submitted_at
      where id=v_attendee_id;
      v_linked_manual:=true;
    else
      insert into public.attendees(
        event_id,invitation_id,attendance_status,category,display_company,
        title_rank,first_name,surname,post_nominals,email,mobile,service,
        discipline,position_role,dietary_requirements,date_of_birth,
        equipment_hire_required,boot_size,attendee_notes,source_last_updated_at,
        record_source
      ) values (
        v_submission.event_id,v_submission.invitation_id,'expected',
        coalesce(nullif(trim(v_payload->>'category'),''),'Other'),
        nullif(trim(v_payload->>'sponsor_name'),''),
        nullif(trim(v_payload->>'title_rank'),''),trim(v_payload->>'first_name'),
        trim(v_payload->>'surname'),nullif(trim(v_payload->>'post_nominals'),''),
        v_email,nullif(trim(v_payload->>'mobile'),''),
        nullif(trim(v_payload->>'service'),''),nullif(trim(v_payload->>'discipline'),''),
        nullif(trim(v_payload->>'role'),''),
        nullif(trim(v_payload->>'dietary_requirements'),''),v_date_of_birth,
        coalesce((v_payload->>'equipment_hire_required')::boolean,false),
        nullif(trim(v_payload->>'boot_size'),''),
        nullif(trim(v_payload->>'other_information'),''),v_submission.submitted_at,
        'registration'
      ) returning id into v_attendee_id;
    end if;

    update public.intake_submissions set
      processing_status='accepted',mapped_attendee_id=v_attendee_id,
      protocol_reviewed_by=v_actor_id,protocol_reviewed_at=now(),
      review_notes=nullif(trim(p_review_notes),''),error_message=null
    where id=v_submission.id;
  else
    update public.intake_submissions set
      processing_status=p_decision,protocol_reviewed_by=v_actor_id,
      protocol_reviewed_at=now(),review_notes=nullif(trim(p_review_notes),''),
      error_message=null
    where id=v_submission.id;
  end if;

  return jsonb_build_object(
    'submission_id',v_submission.id,'decision',p_decision,
    'attendee_id',v_attendee_id,'linked_manual',v_linked_manual
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_protocol_stay(p_attendee_id uuid, p_stay_id uuid, p_location_id uuid, p_room_type_id uuid, p_sharing_with_attendee_id uuid, p_actual_check_in date, p_actual_check_out date, p_billing_from date, p_billing_to date, p_rate_code text, p_protocol_confirmed boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_room_location_id uuid;
  v_share_event_id uuid;
  v_stay_id uuid;
  v_rate numeric;
  v_rate_location_id uuid;
  v_rate_room_type_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'protocol', 'operations']);

  select a.event_id into v_event_id
  from public.attendees a
  where a.id = p_attendee_id;

  if v_event_id is null then
    raise exception 'Attendee not found';
  end if;

  if (p_actual_check_in is null) <> (p_actual_check_out is null) then
    raise exception 'Both actual stay dates are required together';
  end if;

  if p_actual_check_in is not null and p_actual_check_out <= p_actual_check_in then
    raise exception 'Check-out must be after check-in';
  end if;

  if (p_billing_from is null) <> (p_billing_to is null) then
    raise exception 'Both billing dates are required together';
  end if;

  if p_billing_from is not null and p_billing_to <= p_billing_from then
    raise exception 'Billing end must be after billing start';
  end if;

  if p_room_type_id is not null then
    select rt.location_id into v_room_location_id
    from public.room_types rt
    where rt.id = p_room_type_id and rt.active;

    if v_room_location_id is null then
      raise exception 'Room type not found or inactive';
    end if;

    if p_location_id is null or v_room_location_id is distinct from p_location_id then
      raise exception 'Room type does not belong to the selected accommodation';
    end if;
  end if;

  if p_location_id is not null and not exists (
    select 1 from public.accommodation_locations l
    where l.id = p_location_id and l.active
  ) then
    raise exception 'Accommodation location not found or inactive';
  end if;

  if p_sharing_with_attendee_id = p_attendee_id then
    raise exception 'An attendee cannot share with themselves';
  end if;

  if p_sharing_with_attendee_id is not null then
    select a.event_id into v_share_event_id
    from public.attendees a
    where a.id = p_sharing_with_attendee_id;

    if v_share_event_id is distinct from v_event_id then
      raise exception 'Room-sharing attendee must belong to the same event';
    end if;
  end if;

  if nullif(trim(p_rate_code), '') is not null then
    select rc.unit_price, rc.location_id, rc.room_type_id
    into v_rate, v_rate_location_id, v_rate_room_type_id
    from public.rate_card rc
    where rc.event_id = v_event_id
      and rc.rate_code = trim(p_rate_code)
      and rc.active
    order by case when rc.status = 'approved' then 0 else 1 end, rc.updated_at desc
    limit 1;

    if v_rate is null then
      raise exception 'Rate code not found';
    end if;

    if v_rate_location_id is not null and v_rate_location_id is distinct from p_location_id then
      raise exception 'Rate does not match assigned accommodation';
    end if;

    if v_rate_room_type_id is not null and v_rate_room_type_id is distinct from p_room_type_id then
      raise exception 'Rate does not match assigned room or charging role';
    end if;
  end if;

  if p_stay_id is null then
    insert into public.stay_charge_periods (
      attendee_id,
      location_id,
      room_type_id,
      sharing_with_attendee_id,
      actual_check_in,
      actual_check_out,
      billing_from,
      billing_to,
      charge_segment_type,
      rate_code,
      unit_rate,
      protocol_confirmed
    ) values (
      p_attendee_id,
      p_location_id,
      p_room_type_id,
      p_sharing_with_attendee_id,
      p_actual_check_in,
      p_actual_check_out,
      p_billing_from,
      p_billing_to,
      'accommodation',
      nullif(trim(p_rate_code), ''),
      v_rate,
      false
    ) returning id into v_stay_id;
  else
    select s.id into v_stay_id
    from public.stay_charge_periods s
    where s.id = p_stay_id and s.attendee_id = p_attendee_id
    for update;

    if v_stay_id is null then
      raise exception 'Accommodation period not found for this attendee';
    end if;

    update public.stay_charge_periods
    set location_id = p_location_id,
        room_type_id = p_room_type_id,
        sharing_with_attendee_id = p_sharing_with_attendee_id,
        actual_check_in = p_actual_check_in,
        actual_check_out = p_actual_check_out,
        billing_from = p_billing_from,
        billing_to = p_billing_to,
        package_type = null,
        rate_code = nullif(trim(p_rate_code), ''),
        unit_rate = v_rate,
        protocol_confirmed = false,
        updated_at = now()
    where id = v_stay_id;
  end if;

  if coalesce(p_protocol_confirmed, false) then
    if p_location_id is null or p_room_type_id is null
       or p_actual_check_in is null or p_actual_check_out is null
       or p_billing_from is null or p_billing_to is null
       or nullif(trim(p_rate_code), '') is null then
      raise exception 'Accommodation, room, stay dates, billing dates and rate are required before confirmation';
    end if;

    perform public.assign_stay_service(
      v_stay_id,
      p_location_id,
      p_room_type_id,
      p_billing_from,
      p_billing_to,
      trim(p_rate_code),
      v_actor_id
    );
  end if;

  return v_stay_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_protocol_travel(p_attendee_id uuid, p_direction text, p_method_of_transport text, p_airport_station text, p_flight_travel_number text, p_travel_datetime timestamp with time zone, p_resort_datetime timestamp with time zone, p_transfer_requested boolean, p_transfer_service text, p_transfer_chargeable boolean, p_special_transfer_datetime timestamp with time zone, p_assignment_notes text, p_protocol_confirmed boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_travel_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'protocol', 'operations']);

  if p_direction not in ('arrival', 'departure') then
    raise exception 'Direction must be arrival or departure';
  end if;

  if not exists (select 1 from public.attendees a where a.id = p_attendee_id) then
    raise exception 'Attendee not found';
  end if;

  if coalesce(p_transfer_chargeable, false) and not coalesce(p_transfer_requested, false) then
    raise exception 'A chargeable transfer must also be requested';
  end if;

  if coalesce(p_protocol_confirmed, false) then
    if nullif(trim(p_method_of_transport), '') is null then
      raise exception 'Method of transport is required before confirmation';
    end if;

    if coalesce(p_transfer_requested, false)
       and nullif(trim(p_transfer_service), '') is null then
      raise exception 'Transfer service is required before confirmation';
    end if;
  end if;

  select t.id into v_travel_id
  from public.travel_records t
  where t.attendee_id = p_attendee_id and t.direction = p_direction
  for update;

  if v_travel_id is null then
    insert into public.travel_records (attendee_id, direction)
    values (p_attendee_id, p_direction)
    returning id into v_travel_id;
  end if;

  perform public.update_travel_record_service(
    v_travel_id,
    p_method_of_transport,
    p_airport_station,
    p_flight_travel_number,
    p_travel_datetime,
    p_resort_datetime,
    p_transfer_requested,
    p_transfer_service,
    p_transfer_chargeable,
    p_special_transfer_datetime,
    p_assignment_notes,
    p_protocol_confirmed,
    v_actor_id
  );

  return v_travel_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_sponsor_workspace(p_event_id uuid, p_event_sponsor_id uuid, p_organisation_name text, p_short_name text, p_billing_name text, p_billing_address_1 text, p_billing_address_2 text, p_town_city text, p_county_region text, p_postcode text, p_country text, p_billing_email text, p_purchase_order_required boolean, p_purchase_order_instructions text, p_website_url text, p_organisation_notes text, p_sponsor_status text, p_sponsor_tier text, p_room_allocation integer, p_protocol_rep_allowance integer, p_race_funding_sponsor boolean, p_consolidated_invoice_requested boolean, p_display_in_event_app boolean, p_package_notes text, p_sponsor_manager_notes text, p_active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_organisation_id uuid;
  v_event_sponsor_id uuid;
  v_existing_event_id uuid;
  v_name text := nullif(trim(p_organisation_name), '');
  v_status text := coalesce(nullif(trim(p_sponsor_status), ''), 'invited');
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'sponsor_manager']);

  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'Event not found';
  end if;

  if v_name is null then
    raise exception 'Organisation name is required';
  end if;

  if v_status <> all (array['prospective', 'invited', 'confirmed', 'declined', 'cancelled']) then
    raise exception 'Invalid sponsor status';
  end if;

  if coalesce(p_room_allocation, 0) < 0 or coalesce(p_protocol_rep_allowance, 0) < 0 then
    raise exception 'Room and representative allowances cannot be negative';
  end if;

  if p_event_sponsor_id is null then
    select o.id into v_organisation_id
    from public.organisations o
    where lower(o.organisation_name) = lower(v_name)
    limit 1;

    if v_organisation_id is null then
      insert into public.organisations (
        organisation_name,
        short_name,
        billing_name,
        billing_address_1,
        billing_address_2,
        town_city,
        county_region,
        postcode,
        country,
        billing_email,
        sponsor,
        active,
        notes,
        website_url,
        purchase_order_required,
        purchase_order_instructions
      ) values (
        v_name,
        nullif(trim(p_short_name), ''),
        coalesce(nullif(trim(p_billing_name), ''), v_name),
        nullif(trim(p_billing_address_1), ''),
        nullif(trim(p_billing_address_2), ''),
        nullif(trim(p_town_city), ''),
        nullif(trim(p_county_region), ''),
        nullif(trim(p_postcode), ''),
        coalesce(nullif(trim(p_country), ''), 'United Kingdom'),
        nullif(lower(trim(p_billing_email)), ''),
        true,
        true,
        nullif(trim(p_organisation_notes), ''),
        nullif(trim(p_website_url), ''),
        coalesce(p_purchase_order_required, false),
        nullif(trim(p_purchase_order_instructions), '')
      ) returning id into v_organisation_id;
    else
      if exists (
        select 1 from public.event_sponsors es
        where es.event_id = p_event_id and es.organisation_id = v_organisation_id
      ) then
        raise exception 'This organisation is already a sponsor for the event';
      end if;

      update public.organisations
      set organisation_name = v_name,
          short_name = nullif(trim(p_short_name), ''),
          billing_name = coalesce(nullif(trim(p_billing_name), ''), v_name),
          billing_address_1 = nullif(trim(p_billing_address_1), ''),
          billing_address_2 = nullif(trim(p_billing_address_2), ''),
          town_city = nullif(trim(p_town_city), ''),
          county_region = nullif(trim(p_county_region), ''),
          postcode = nullif(trim(p_postcode), ''),
          country = coalesce(nullif(trim(p_country), ''), 'United Kingdom'),
          billing_email = nullif(lower(trim(p_billing_email)), ''),
          sponsor = true,
          active = true,
          notes = nullif(trim(p_organisation_notes), ''),
          website_url = nullif(trim(p_website_url), ''),
          purchase_order_required = coalesce(p_purchase_order_required, false),
          purchase_order_instructions = nullif(trim(p_purchase_order_instructions), ''),
          updated_at = now()
      where id = v_organisation_id;
    end if;

    insert into public.event_sponsors (
      event_id,
      organisation_id,
      sponsor_status,
      room_allocation,
      race_funding_sponsor,
      consolidated_invoice_requested,
      package_notes,
      active,
      sponsor_tier,
      display_in_event_app,
      protocol_rep_allowance,
      sponsor_manager_notes
    ) values (
      p_event_id,
      v_organisation_id,
      v_status,
      coalesce(p_room_allocation, 0),
      coalesce(p_race_funding_sponsor, false),
      coalesce(p_consolidated_invoice_requested, false),
      nullif(trim(p_package_notes), ''),
      coalesce(p_active, true),
      nullif(trim(p_sponsor_tier), ''),
      coalesce(p_display_in_event_app, true),
      coalesce(p_protocol_rep_allowance, 0),
      nullif(trim(p_sponsor_manager_notes), '')
    ) returning id into v_event_sponsor_id;
  else
    select es.event_id, es.organisation_id
    into v_existing_event_id, v_organisation_id
    from public.event_sponsors es
    where es.id = p_event_sponsor_id
    for update;

    if v_existing_event_id is null or v_existing_event_id is distinct from p_event_id then
      raise exception 'Sponsor record not found for this event';
    end if;

    if exists (
      select 1 from public.organisations o
      where lower(o.organisation_name) = lower(v_name)
        and o.id <> v_organisation_id
    ) then
      raise exception 'Another organisation already uses this name';
    end if;

    update public.organisations
    set organisation_name = v_name,
        short_name = nullif(trim(p_short_name), ''),
        billing_name = coalesce(nullif(trim(p_billing_name), ''), v_name),
        billing_address_1 = nullif(trim(p_billing_address_1), ''),
        billing_address_2 = nullif(trim(p_billing_address_2), ''),
        town_city = nullif(trim(p_town_city), ''),
        county_region = nullif(trim(p_county_region), ''),
        postcode = nullif(trim(p_postcode), ''),
        country = coalesce(nullif(trim(p_country), ''), 'United Kingdom'),
        billing_email = nullif(lower(trim(p_billing_email)), ''),
        sponsor = true,
        notes = nullif(trim(p_organisation_notes), ''),
        website_url = nullif(trim(p_website_url), ''),
        purchase_order_required = coalesce(p_purchase_order_required, false),
        purchase_order_instructions = nullif(trim(p_purchase_order_instructions), ''),
        updated_at = now()
    where id = v_organisation_id;

    update public.event_sponsors
    set sponsor_status = v_status,
        room_allocation = coalesce(p_room_allocation, 0),
        race_funding_sponsor = coalesce(p_race_funding_sponsor, false),
        consolidated_invoice_requested = coalesce(p_consolidated_invoice_requested, false),
        package_notes = nullif(trim(p_package_notes), ''),
        active = coalesce(p_active, true),
        sponsor_tier = nullif(trim(p_sponsor_tier), ''),
        display_in_event_app = coalesce(p_display_in_event_app, true),
        protocol_rep_allowance = coalesce(p_protocol_rep_allowance, 0),
        sponsor_manager_notes = nullif(trim(p_sponsor_manager_notes), ''),
        updated_at = now()
    where id = p_event_sponsor_id;

    v_event_sponsor_id := p_event_sponsor_id;
  end if;

  return v_event_sponsor_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_sponsor_contact(p_event_sponsor_id uuid, p_contact_id uuid, p_first_name text, p_surname text, p_job_title text, p_email text, p_mobile text, p_primary_contact boolean, p_billing_contact boolean, p_active boolean, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_organisation_id uuid;
  v_contact_id uuid;
  v_first_name text := nullif(trim(p_first_name), '');
  v_surname text := nullif(trim(p_surname), '');
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'sponsor_manager']);

  select es.event_id, es.organisation_id
  into v_event_id, v_organisation_id
  from public.event_sponsors es
  where es.id = p_event_sponsor_id;

  if v_event_id is null then
    raise exception 'Sponsor record not found';
  end if;

  if v_first_name is null or v_surname is null then
    raise exception 'Contact first name and surname are required';
  end if;

  if nullif(trim(p_email), '') is null and nullif(trim(p_mobile), '') is null then
    raise exception 'Enter an email address or mobile number for the contact';
  end if;

  if coalesce(p_primary_contact, false) then
    update public.sponsor_contacts
    set primary_contact = false
    where organisation_id = v_organisation_id
      and event_id = v_event_id
      and (p_contact_id is null or id <> p_contact_id);
  end if;

  if coalesce(p_billing_contact, false) then
    update public.sponsor_contacts
    set billing_contact = false
    where organisation_id = v_organisation_id
      and event_id = v_event_id
      and (p_contact_id is null or id <> p_contact_id);
  end if;

  if p_contact_id is null then
    insert into public.sponsor_contacts (
      organisation_id,
      event_id,
      first_name,
      surname,
      job_title,
      email,
      mobile,
      primary_contact,
      billing_contact,
      active,
      notes
    ) values (
      v_organisation_id,
      v_event_id,
      v_first_name,
      v_surname,
      nullif(trim(p_job_title), ''),
      nullif(lower(trim(p_email)), ''),
      nullif(trim(p_mobile), ''),
      coalesce(p_primary_contact, false),
      coalesce(p_billing_contact, false),
      coalesce(p_active, true),
      nullif(trim(p_notes), '')
    ) returning id into v_contact_id;
  else
    select sc.id into v_contact_id
    from public.sponsor_contacts sc
    where sc.id = p_contact_id
      and sc.organisation_id = v_organisation_id
      and sc.event_id = v_event_id
    for update;

    if v_contact_id is null then
      raise exception 'Contact not found for this sponsor';
    end if;

    update public.sponsor_contacts
    set first_name = v_first_name,
        surname = v_surname,
        job_title = nullif(trim(p_job_title), ''),
        email = nullif(lower(trim(p_email)), ''),
        mobile = nullif(trim(p_mobile), ''),
        primary_contact = coalesce(p_primary_contact, false),
        billing_contact = coalesce(p_billing_contact, false),
        active = coalesce(p_active, true),
        notes = nullif(trim(p_notes), '')
    where id = v_contact_id;
  end if;

  return v_contact_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_sponsor_attendee_links(p_event_sponsor_id uuid, p_attendee_id uuid, p_display_as_sponsor boolean, p_bill_to_sponsor boolean, p_consolidated_invoice_included boolean, p_linked_main_attendee_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_organisation_id uuid;
  v_attendee_event_id uuid;
  v_current_organisation_id uuid;
  v_current_billing_id uuid;
  v_current_consolidated boolean;
  v_main_event_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'sponsor_manager']);

  select es.event_id, es.organisation_id
  into v_event_id, v_organisation_id
  from public.event_sponsors es
  where es.id = p_event_sponsor_id;

  if v_event_id is null then
    raise exception 'Sponsor record not found';
  end if;

  select a.event_id, a.organisation_id, a.billing_account_organisation_id,
         a.consolidated_invoice_included
  into v_attendee_event_id, v_current_organisation_id, v_current_billing_id,
       v_current_consolidated
  from public.attendees a
  where a.id = p_attendee_id
  for update;

  if v_attendee_event_id is null or v_attendee_event_id is distinct from v_event_id then
    raise exception 'Attendee does not belong to the sponsor event';
  end if;

  if p_linked_main_attendee_id = p_attendee_id then
    raise exception 'An attendee cannot be linked to themselves';
  end if;

  if p_linked_main_attendee_id is not null then
    select a.event_id into v_main_event_id
    from public.attendees a
    where a.id = p_linked_main_attendee_id;

    if v_main_event_id is null or v_main_event_id is distinct from v_event_id then
      raise exception 'Main attendee must belong to the same event';
    end if;
  end if;

  update public.attendees
  set organisation_id = case
        when coalesce(p_display_as_sponsor, false) then v_organisation_id
        when v_current_organisation_id = v_organisation_id then null
        else v_current_organisation_id
      end,
      billing_account_organisation_id = case
        when coalesce(p_bill_to_sponsor, false) then v_organisation_id
        when v_current_billing_id = v_organisation_id then null
        else v_current_billing_id
      end,
      consolidated_invoice_included = case
        when coalesce(p_bill_to_sponsor, false)
          then coalesce(p_consolidated_invoice_included, true)
        when v_current_billing_id = v_organisation_id then false
        else v_current_consolidated
      end,
      linked_main_attendee_id = p_linked_main_attendee_id,
      data_checked = false,
      checked_by = null,
      checked_at = null,
      updated_at = now()
  where id = p_attendee_id;

  return p_attendee_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.clean_finance_draft_lines(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_status text;
begin
  select i.status into v_status
  from public.invoices i
  where i.id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found';
  end if;

  if v_status not in ('draft', 'awaiting_billing_update', 'ready_for_review') then
    raise exception 'Only a draft invoice can be rebuilt';
  end if;

  delete from public.invoice_lines il
  where il.invoice_id = p_invoice_id
    and (
      (il.source_type = 'stay' and not exists (
        select 1 from public.stay_charge_periods s
        where s.id = il.source_id and s.protocol_confirmed
      ))
      or
      (il.source_type = 'lift_pass' and not exists (
        select 1 from public.lift_passes l
        where l.id = il.source_id
          and l.required
          and l.chargeable
          and l.protocol_confirmed
      ))
      or
      (il.source_type in ('usage', 'usage_vat') and not exists (
        select 1 from public.usage_extras u
        where u.id = il.source_id
          and u.chargeable
          and not public.usage_charge_suppressed(u.id)
      ))
    );

  update public.invoices i
  set net_total = totals.net_total,
      vat_total = totals.vat_total,
      gross_total = totals.gross_total,
      updated_at = now()
  from (
    select coalesce(sum(il.net_amount), 0) as net_total,
           coalesce(sum(il.vat_amount), 0) as vat_total,
           coalesce(sum(il.gross_amount), 0) as gross_total
    from public.invoice_lines il
    where il.invoice_id = p_invoice_id
  ) totals
  where i.id = p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_save_staff_access(p_email text, p_display_name text, p_app_role text, p_active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_email text:=lower(trim(coalesce(p_email,'')));
  v_user_id uuid;
  v_access_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin']);
  if length(v_email) not between 3 and 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;
  if p_app_role not in ('admin','sponsor_manager','protocol','finance','operations','content_manager','read_only') then
    raise exception 'Choose a valid staff role';
  end if;

  select id into v_user_id from auth.users where lower(email)=v_email order by created_at limit 1;
  if v_user_id=v_actor and (not coalesce(p_active,false) or p_app_role<>'admin') then
    raise exception 'You cannot deactivate or remove your own administrator role';
  end if;

  insert into private.staff_access_allowlist(
    email,display_name,app_role,active,created_by,updated_by
  ) values (
    v_email,nullif(trim(p_display_name),''),p_app_role,coalesce(p_active,false),v_actor,v_actor
  )
  on conflict(email) do update set
    display_name=excluded.display_name,
    app_role=excluded.app_role,
    active=excluded.active,
    updated_by=v_actor,
    updated_at=now()
  returning id into v_access_id;

  if v_user_id is not null then
    insert into public.profiles(id,display_name,email,app_role,active)
    values(v_user_id,coalesce(nullif(trim(p_display_name),''),split_part(v_email,'@',1)),v_email,p_app_role,coalesce(p_active,false))
    on conflict(id) do update set
      display_name=coalesce(nullif(trim(p_display_name),''),public.profiles.display_name),
      email=v_email,
      app_role=p_app_role,
      active=coalesce(p_active,false),
      updated_at=now();
  end if;
  return v_access_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.review_finance_transfer(p_travel_id uuid, p_reviewed boolean, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  return public.review_transfer_billing_service(
    p_travel_id,
    coalesce(p_reviewed, false),
    p_notes,
    v_actor_id
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION private.finance_transfer_package_complete(p_attendee_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.usage_extras u
    join public.attendees a on a.id = u.attendee_id
    join public.rate_card rc
      on rc.event_id = a.event_id
     and rc.rate_code = u.rate_code
     and rc.active
     and rc.charge_category in ('transfer', 'admin')
    where u.attendee_id = p_attendee_id
      and u.category in ('transfer', 'admin')
      and (
        (u.chargeable and u.quantity > 0 and rc.charge_category = u.category)
        or
        (not u.chargeable and nullif(trim(coalesce(u.notes, '')), '') is not null)
      )
  );
$function$
;
CREATE OR REPLACE FUNCTION public.save_finance_transfer_package(p_attendee_id uuid, p_rate_code text, p_waived boolean, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_billing_organisation_id uuid;
  v_consolidated boolean;
  v_rate_code text;
  v_category text;
  v_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  select a.event_id, a.billing_account_organisation_id, a.consolidated_invoice_included
  into v_event_id, v_billing_organisation_id, v_consolidated
  from public.attendees a
  where a.id = p_attendee_id;

  if v_event_id is null then
    raise exception 'Attendee not found';
  end if;

  if exists (
    select 1
    from public.invoices i
    where i.event_id = v_event_id
      and i.status in ('approved', 'issued', 'paid')
      and (
        (i.invoice_type = 'individual' and i.attendee_id = p_attendee_id)
        or
        (i.invoice_type = 'consolidated_company'
          and v_consolidated
          and i.billing_account_organisation_id = v_billing_organisation_id)
      )
  ) then
    raise exception 'The transfer package cannot be changed after its invoice has been finalised';
  end if;

  if coalesce(p_waived, false) then
    if nullif(trim(coalesce(p_notes, '')), '') is null then
      raise exception 'A reason is required when no charge is applied';
    end if;

    select rc.rate_code, rc.charge_category
    into v_rate_code, v_category
    from public.rate_card rc
    where rc.event_id = v_event_id
      and rc.rate_code = '2027_ADMIN_ONLY'
      and rc.charge_category = 'admin'
      and rc.active
    order by case when rc.status = 'approved' then 0 else 1 end, rc.updated_at desc
    limit 1;
  else
    if nullif(trim(coalesce(p_rate_code, '')), '') is null then
      raise exception 'Choose a transfer billing package';
    end if;

    select rc.rate_code, rc.charge_category
    into v_rate_code, v_category
    from public.rate_card rc
    where rc.event_id = v_event_id
      and rc.rate_code = p_rate_code
      and rc.charge_category in ('transfer', 'admin')
      and rc.active
    order by case when rc.status = 'approved' then 0 else 1 end, rc.updated_at desc
    limit 1;
  end if;

  if v_rate_code is null then
    raise exception 'The selected transfer billing rate is not available';
  end if;

  if not coalesce(p_waived, false) and v_category = 'transfer' then
    if not exists (
      select 1 from public.travel_records t
      where t.attendee_id = p_attendee_id and t.transfer_chargeable
    ) then
      raise exception 'No chargeable transfer is recorded for this attendee';
    end if;

    if exists (
      select 1 from public.travel_records t
      where t.attendee_id = p_attendee_id
        and t.transfer_chargeable
        and not t.billing_reviewed
    ) then
      raise exception 'Review every chargeable transfer before choosing the billing package';
    end if;
  end if;

  if not coalesce(p_waived, false) and v_category = 'admin' and exists (
    select 1 from public.travel_records t
    where t.attendee_id = p_attendee_id and t.transfer_chargeable
  ) then
    raise exception 'Use a transfer-inclusive package while chargeable transfers are recorded';
  end if;

  select u.id into v_id
  from public.usage_extras u
  where u.attendee_id = p_attendee_id
    and u.category in ('transfer', 'admin')
  for update;

  if v_id is null then
    insert into public.usage_extras(
      attendee_id, usage_date, category, quantity, rate_code,
      chargeable, notes, recorded_by
    ) values (
      p_attendee_id, null, v_category, 1, v_rate_code,
      not coalesce(p_waived, false), nullif(trim(p_notes), ''), v_actor_id
    )
    returning id into v_id;
  else
    update public.usage_extras
    set usage_date = null,
        category = v_category,
        quantity = 1,
        rate_code = v_rate_code,
        chargeable = not coalesce(p_waived, false),
        notes = nullif(trim(p_notes), ''),
        recorded_by = v_actor_id,
        approved_exception = false,
        exception_reason = null,
        exception_approved_by = null,
        exception_approved_at = null
    where id = v_id;
  end if;

  update public.attendees
  set data_checked = false,
      checked_by = null,
      checked_at = null,
      exception_flag = false,
      exception_reason = null
  where id = p_attendee_id;

  update public.invoices i
  set status = 'awaiting_billing_update', updated_at = now()
  where i.event_id = v_event_id
    and i.status in ('draft', 'awaiting_billing_update', 'ready_for_review')
    and (
      (i.invoice_type = 'individual' and i.attendee_id = p_attendee_id)
      or
      (i.invoice_type = 'consolidated_company'
        and v_consolidated
        and i.billing_account_organisation_id = v_billing_organisation_id)
    );

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.mark_finance_attendee_checked(p_attendee_id uuid, p_exception_flag boolean, p_exception_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_readiness public.v_invoice_readiness%rowtype;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  select * into v_readiness
  from public.v_invoice_readiness r
  where r.attendee_id = p_attendee_id;

  if v_readiness.attendee_id is null then
    raise exception 'Attendee not found';
  end if;

  if not v_readiness.accommodation_confirmed then
    raise exception 'Accommodation must be confirmed before the final data check';
  end if;

  if not v_readiness.lift_pass_confirmed then
    raise exception 'Lift pass details must be confirmed before the final data check';
  end if;

  if not v_readiness.transfer_billing_reviewed then
    raise exception 'All chargeable transfers must be reviewed before the final data check';
  end if;

  if not v_readiness.rate_lookup_complete then
    raise exception 'Every chargeable service needs a matching rate before the final data check';
  end if;

  if not private.finance_transfer_package_complete(p_attendee_id) then
    raise exception 'Choose the attendee transfer billing package before the final data check';
  end if;

  if coalesce(p_exception_flag, false)
     and nullif(trim(coalesce(p_exception_reason, '')), '') is null then
    raise exception 'An exception reason is required';
  end if;

  return public.mark_attendee_checked_service(
    p_attendee_id,
    coalesce(p_exception_flag, false),
    p_exception_reason,
    v_actor_id
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_finance_individual_draft(p_attendee_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_billing_organisation_id uuid;
  v_consolidated boolean;
  v_invoice_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  select a.event_id, a.billing_account_organisation_id, a.consolidated_invoice_included
  into v_event_id, v_billing_organisation_id, v_consolidated
  from public.attendees a
  where a.id = p_attendee_id;

  if v_event_id is null then
    raise exception 'Attendee not found';
  end if;

  if v_billing_organisation_id is not null and coalesce(v_consolidated, false) then
    raise exception 'This attendee is selected for consolidated organisation billing';
  end if;

  if not private.finance_transfer_package_complete(p_attendee_id) then
    raise exception 'Choose the attendee transfer billing package before creating the draft';
  end if;

  if exists (
    select 1 from public.invoices i
    where i.attendee_id = p_attendee_id
      and i.invoice_type = 'individual'
      and i.status in ('approved', 'issued', 'paid')
  ) then
    raise exception 'A finalised individual invoice already exists for this attendee';
  end if;

  v_invoice_id := public.create_or_rebuild_individual_invoice_service(p_attendee_id, v_actor_id);
  perform private.clean_finance_draft_lines(v_invoice_id);
  update public.invoices
  set status = 'ready_for_review', updated_at = now()
  where id = v_invoice_id and status in ('draft', 'awaiting_billing_update');
  return v_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_finance_consolidated_draft(p_event_id uuid, p_organisation_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_invoice_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  if not exists (
    select 1 from public.event_sponsors es
    where es.event_id = p_event_id
      and es.organisation_id = p_organisation_id
      and es.active
  ) then
    raise exception 'Active event sponsor not found';
  end if;

  if exists (
    select 1
    from public.attendees a
    where a.event_id = p_event_id
      and a.billing_account_organisation_id = p_organisation_id
      and a.consolidated_invoice_included
      and not private.finance_transfer_package_complete(a.id)
  ) then
    raise exception 'Every selected attendee needs a transfer billing package';
  end if;

  if exists (
    select 1 from public.invoices i
    where i.event_id = p_event_id
      and i.billing_account_organisation_id = p_organisation_id
      and i.invoice_type = 'consolidated_company'
      and i.status in ('approved', 'issued', 'paid')
  ) then
    raise exception 'A finalised consolidated invoice already exists for this organisation';
  end if;

  v_invoice_id := public.create_or_rebuild_consolidated_invoice_service(
    p_event_id,
    p_organisation_id,
    v_actor_id
  );
  perform private.clean_finance_draft_lines(v_invoice_id);
  update public.invoices
  set status = 'ready_for_review', updated_at = now()
  where id = v_invoice_id and status in ('draft', 'awaiting_billing_update');
  return v_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_finance_rate(p_rate_id uuid, p_description text, p_unit_price numeric, p_vat_rate numeric, p_source_note text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_rate public.rate_card%rowtype;
  v_description text := nullif(trim(coalesce(p_description, '')), '');
  v_unit_price numeric;
  v_vat_rate numeric;
  v_price_changed boolean;
  v_financial_changed boolean;
  v_invoice_content_changed boolean;
  v_attendee_ids uuid[];
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  select * into v_rate
  from public.rate_card
  where id = p_rate_id
  for update;

  if v_rate.id is null then
    raise exception 'Rate not found';
  end if;

  if v_description is null then
    raise exception 'Rate description is required';
  end if;

  if p_unit_price is null or p_unit_price < 0 then
    raise exception 'Unit price must be zero or greater';
  end if;

  if p_vat_rate is not null and (p_vat_rate < 0 or p_vat_rate > 100) then
    raise exception 'VAT rate must be between 0 and 100';
  end if;

  v_unit_price := round(p_unit_price, 2);
  v_vat_rate := case when p_vat_rate is null then null else round(p_vat_rate, 2) end;
  v_price_changed := v_rate.unit_price is distinct from v_unit_price;
  v_financial_changed := v_price_changed or v_rate.vat_rate is distinct from v_vat_rate;
  v_invoice_content_changed := v_financial_changed or v_rate.description is distinct from v_description;

  select coalesce(array_agg(distinct affected.attendee_id), array[]::uuid[])
  into v_attendee_ids
  from (
    select s.attendee_id
    from public.stay_charge_periods s
    join public.attendees a on a.id = s.attendee_id
    where a.event_id = v_rate.event_id and s.rate_code = v_rate.rate_code
    union
    select l.attendee_id
    from public.lift_passes l
    join public.attendees a on a.id = l.attendee_id
    where a.event_id = v_rate.event_id and l.rate_code = v_rate.rate_code
    union
    select u.attendee_id
    from public.usage_extras u
    join public.attendees a on a.id = u.attendee_id
    where a.event_id = v_rate.event_id and u.rate_code = v_rate.rate_code
    union
    select u.attendee_id
    from public.usage_extras u
    join public.attendees a on a.id = u.attendee_id
    join public.rate_card base_rate
      on base_rate.event_id = a.event_id
     and base_rate.rate_code = u.rate_code
     and base_rate.paired_rate_code = v_rate.rate_code
    where a.event_id = v_rate.event_id
  ) affected;

  update public.rate_card
  set description = v_description,
      unit_price = v_unit_price,
      vat_rate = v_vat_rate,
      source_note = nullif(trim(coalesce(p_source_note, '')), ''),
      status = 'approved',
      active = true,
      confirmed_by = v_actor_id,
      confirmed_at = now()
  where id = v_rate.id;

  if v_price_changed then
    update public.stay_charge_periods s
    set unit_rate = v_unit_price
    from public.attendees a
    where a.id = s.attendee_id
      and a.event_id = v_rate.event_id
      and s.rate_code = v_rate.rate_code;

    update public.lift_passes l
    set unit_rate = v_unit_price
    from public.attendees a
    where a.id = l.attendee_id
      and a.event_id = v_rate.event_id
      and l.rate_code = v_rate.rate_code;

    update public.usage_extras u
    set unit_rate = v_unit_price
    from public.attendees a
    where a.id = u.attendee_id
      and a.event_id = v_rate.event_id
      and u.rate_code = v_rate.rate_code;
  end if;

  if v_financial_changed and cardinality(v_attendee_ids) > 0 then
    update public.attendees
    set data_checked = false,
        checked_by = null,
        checked_at = null,
        exception_flag = false,
        exception_reason = null
    where id = any(v_attendee_ids);
  end if;

  if v_invoice_content_changed then
    update public.invoices i
    set status = 'awaiting_billing_update',
        updated_at = now()
    where i.event_id = v_rate.event_id
      and i.status in ('draft', 'awaiting_billing_update', 'ready_for_review')
      and (
        exists (
          select 1 from public.invoice_lines line
          where line.invoice_id = i.id and line.rate_code = v_rate.rate_code
        )
        or i.attendee_id = any(v_attendee_ids)
        or exists (
          select 1
          from public.attendees a
          where a.id = any(v_attendee_ids)
            and a.consolidated_invoice_included
            and a.billing_account_organisation_id = i.billing_account_organisation_id
        )
      );
  end if;

  return v_rate.id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_finance_billing_settings(p_event_id uuid, p_invoice_prefix text, p_invoice_issuer_name text, p_invoice_issuer_address text, p_invoice_issuer_legal_details text, p_invoice_payment_instructions text, p_invoice_footer text, p_default_payment_terms_days integer, p_confirmed boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_prefix text := nullif(trim(coalesce(p_invoice_prefix, '')), '');
  v_issuer_name text := nullif(trim(coalesce(p_invoice_issuer_name, '')), '');
  v_issuer_address text := nullif(trim(coalesce(p_invoice_issuer_address, '')), '');
  v_payment_instructions text := nullif(trim(coalesce(p_invoice_payment_instructions, '')), '');
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'Event not found';
  end if;

  if v_prefix is null or length(v_prefix) > 30 then
    raise exception 'Invoice prefix is required and must be 30 characters or fewer';
  end if;

  if p_default_payment_terms_days is null
     or p_default_payment_terms_days < 0
     or p_default_payment_terms_days > 365 then
    raise exception 'Default payment terms must be between 0 and 365 days';
  end if;

  if coalesce(p_confirmed, false)
     and (v_issuer_name is null or v_issuer_address is null or v_payment_instructions is null) then
    raise exception 'Issuer name, issuer address and payment instructions are required before confirmation';
  end if;

  update public.events
  set invoice_prefix = v_prefix,
      invoice_issuer_name = v_issuer_name,
      invoice_issuer_address = v_issuer_address,
      invoice_issuer_legal_details = nullif(trim(coalesce(p_invoice_issuer_legal_details, '')), ''),
      invoice_payment_instructions = v_payment_instructions,
      invoice_footer = nullif(trim(coalesce(p_invoice_footer, '')), ''),
      invoice_default_payment_terms_days = p_default_payment_terms_days,
      billing_configuration_confirmed = coalesce(p_confirmed, false),
      billing_configuration_confirmed_by = case when coalesce(p_confirmed, false) then v_actor_id else null end,
      billing_configuration_confirmed_at = case when coalesce(p_confirmed, false) then now() else null end,
      updated_at = now()
  where id = p_event_id;

  return p_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_finance_invoice_metadata(p_invoice_id uuid, p_purchase_order_reference text, p_payment_link text, p_due_date date, p_payment_terms_days integer, p_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_status text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  select i.status into v_status
  from public.invoices i
  where i.id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found';
  end if;

  if v_status not in ('draft', 'awaiting_billing_update', 'ready_for_review', 'approved') then
    raise exception 'Issued, paid, cancelled or void invoice metadata is immutable';
  end if;

  if p_payment_terms_days is null
     or p_payment_terms_days < 0
     or p_payment_terms_days > 365 then
    raise exception 'Payment terms must be between 0 and 365 days';
  end if;

  update public.invoices
  set purchase_order_reference = nullif(trim(coalesce(p_purchase_order_reference, '')), ''),
      payment_link = nullif(trim(coalesce(p_payment_link, '')), ''),
      due_date = p_due_date,
      payment_terms_days = p_payment_terms_days,
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
  where id = p_invoice_id;

  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.snapshot_invoice_document(p_invoice_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invoice public.invoices%rowtype;
  v_event public.events%rowtype;
  v_recipient_name text;
  v_recipient_email text;
  v_recipient_address text;
begin
  select * into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  select * into v_event
  from public.events
  where id = v_invoice.event_id;

  if v_invoice.invoice_type = 'individual' then
    select
      nullif(trim(concat_ws(' ', a.title_rank, a.first_name, a.surname)), ''),
      nullif(trim(a.email), '')
    into v_recipient_name, v_recipient_email
    from public.attendees a
    where a.id = v_invoice.attendee_id;
  elsif v_invoice.invoice_type = 'consolidated_company' then
    select
      nullif(trim(coalesce(o.billing_name, o.organisation_name)), ''),
      nullif(trim(o.billing_email), ''),
      nullif(trim(concat_ws(E'\n',
        nullif(trim(o.billing_address_1), ''),
        nullif(trim(o.billing_address_2), ''),
        nullif(trim(o.town_city), ''),
        nullif(trim(o.county_region), ''),
        nullif(trim(o.postcode), ''),
        nullif(trim(o.country), '')
      )), '')
    into v_recipient_name, v_recipient_email, v_recipient_address
    from public.organisations o
    where o.id = v_invoice.billing_account_organisation_id;
  end if;

  update public.invoices
  set issuer_name_snapshot = coalesce(issuer_name_snapshot, nullif(trim(v_event.invoice_issuer_name), '')),
      issuer_address_snapshot = coalesce(issuer_address_snapshot, nullif(trim(v_event.invoice_issuer_address), '')),
      issuer_legal_details_snapshot = coalesce(issuer_legal_details_snapshot, nullif(trim(v_event.invoice_issuer_legal_details), '')),
      payment_instructions_snapshot = coalesce(payment_instructions_snapshot, nullif(trim(v_event.invoice_payment_instructions), '')),
      invoice_footer_snapshot = coalesce(invoice_footer_snapshot, nullif(trim(v_event.invoice_footer), '')),
      recipient_name_snapshot = coalesce(recipient_name_snapshot, v_recipient_name),
      recipient_email_snapshot = coalesce(recipient_email_snapshot, v_recipient_email),
      recipient_address_snapshot = coalesce(recipient_address_snapshot, v_recipient_address),
      event_name_snapshot = coalesce(event_name_snapshot, nullif(trim(v_event.name), '')),
      event_start_date_snapshot = coalesce(event_start_date_snapshot, v_event.start_date),
      event_end_date_snapshot = coalesce(event_end_date_snapshot, v_event.end_date),
      updated_at = now()
  where id = p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.advance_finance_invoice(p_invoice_id uuid, p_next_status text, p_payment_method text DEFAULT NULL::text, p_payment_reference text DEFAULT NULL::text, p_payment_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_status text;
  v_default_terms integer;
  v_payment_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(v_actor_id, array['admin', 'finance']);

  if p_next_status not in ('approved', 'issued', 'paid') then
    raise exception 'Invalid Finance workflow action';
  end if;

  select i.event_id, i.status
  into v_event_id, v_status
  from public.invoices i
  where i.id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found';
  end if;

  if p_next_status = 'approved' then
    select e.invoice_default_payment_terms_days
    into v_default_terms
    from public.events e
    where e.id = v_event_id;

    update public.invoices
    set payment_terms_days = coalesce(payment_terms_days, v_default_terms, 14)
    where id = p_invoice_id;
  end if;

  perform public.set_invoice_status_service(p_invoice_id, p_next_status, v_actor_id);

  if p_next_status = 'approved' then
    perform private.snapshot_invoice_document(p_invoice_id);
    update public.invoices
    set approved_by = v_actor_id,
        approved_at = coalesce(approved_at, now()),
        updated_at = now()
    where id = p_invoice_id;
  elsif p_next_status = 'issued' then
    perform private.snapshot_invoice_document(p_invoice_id);
    update public.invoices
    set issued_by = v_actor_id,
        issued_at = coalesce(issued_at, now()),
        updated_at = now()
    where id = p_invoice_id;
  else
    update public.invoices
    set paid_by = v_actor_id,
        payment_reference = nullif(trim(coalesce(p_payment_reference, '')), ''),
        updated_at = now()
    where id = p_invoice_id;

    select p.id into v_payment_id
    from public.payments p
    where p.invoice_id = p_invoice_id
    order by p.created_at desc
    limit 1;

    if v_payment_id is not null then
      update public.payments
      set payment_method = coalesce(nullif(trim(coalesce(p_payment_method, '')), ''), payment_method, 'manual'),
          provider_reference = nullif(trim(coalesce(p_payment_reference, '')), ''),
          notes = coalesce(nullif(trim(coalesce(p_payment_notes, '')), ''), notes)
      where id = v_payment_id;
    end if;
  end if;

  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.issue_invoice_for_delivery_service(p_invoice_id uuid, p_actor_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_status text;
begin
  perform private.require_actor_role(p_actor_id, array['admin', 'finance']);

  select i.status into v_status
  from public.invoices i
  where i.id = p_invoice_id
  for update;

  if v_status is null then
    raise exception 'Invoice not found';
  end if;

  if v_status = 'approved' then
    perform public.set_invoice_status_service(p_invoice_id, 'issued', p_actor_id);
    update public.invoices
    set issued_by = p_actor_id,
        issued_at = coalesce(issued_at, now()),
        updated_at = now()
    where id = p_invoice_id;
  elsif v_status not in ('issued', 'paid') then
    raise exception 'Invoice must be confirmed before it can be sent';
  end if;

  perform private.snapshot_invoice_document(p_invoice_id);
  return p_invoice_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.is_event_attendee(target_event uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.profiles p
    join public.attendees a on a.id = p.attendee_id
    where p.id = (select auth.uid())
      and p.active
      and a.event_id = target_event
  ) or exists (
    select 1
    from public.user_attendee_links l
    join public.profiles p on p.id = l.user_id
    where l.user_id = (select auth.uid())
      and p.active
      and l.event_id = target_event
  );
$function$
;
CREATE OR REPLACE FUNCTION public.replace_transfer_passengers(p_transfer_run_id uuid, p_attendee_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_capacity integer;
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform private.require_actor_role(v_actor_id, array['admin','protocol','operations']);

  select event_id, capacity into v_event_id, v_capacity
  from public.transfer_runs
  where id = p_transfer_run_id
  for update;
  if v_event_id is null then raise exception 'Transfer not found'; end if;
  if v_capacity is not null and cardinality(coalesce(p_attendee_ids, array[]::uuid[])) > v_capacity then
    raise exception 'Passenger count exceeds the transfer capacity of %', v_capacity;
  end if;

  if exists (
    select 1 from unnest(coalesce(p_attendee_ids, array[]::uuid[])) selected(id)
    left join public.attendees a on a.id = selected.id and a.event_id = v_event_id
    where a.id is null
  ) then
    raise exception 'Every selected passenger must belong to this event';
  end if;

  delete from public.transfer_passengers where transfer_run_id = p_transfer_run_id;
  insert into public.transfer_passengers(
    transfer_run_id, attendee_id, passenger_name_snapshot, passenger_mobile_snapshot, sort_order
  )
  select p_transfer_run_id, a.id,
    nullif(trim(concat_ws(' ', a.title_rank, a.first_name, a.surname)), ''),
    nullif(trim(a.mobile), ''),
    row_number() over(order by a.surname, a.first_name)::integer
  from public.attendees a
  where a.event_id = v_event_id
    and a.id = any(coalesce(p_attendee_ids, array[]::uuid[]));

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.replace_table_assignments(p_seating_table_id uuid, p_assignments jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid := auth.uid();
  v_event_id uuid;
  v_capacity integer;
  v_count integer;
begin
  if v_actor_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  perform private.require_actor_role(v_actor_id, array['admin','protocol','operations','content_manager']);

  select st.event_id, st.capacity
  into v_event_id, v_capacity
  from public.seating_tables st
  where st.id = p_seating_table_id
  for update;
  if v_event_id is null then raise exception 'Seating table not found'; end if;
  if jsonb_typeof(coalesce(p_assignments, '[]'::jsonb)) <> 'array' then
    raise exception 'Assignments must be an array';
  end if;
  if jsonb_array_length(coalesce(p_assignments, '[]'::jsonb)) > v_capacity then
    raise exception 'This table has only % places', v_capacity;
  end if;

  create temporary table if not exists pg_temp.table_assignment_input (
    seat_number integer,
    attendee_id uuid,
    event_sponsor_id uuid,
    guest_name text,
    guest_role text,
    sponsor_host boolean
  ) on commit drop;
  truncate pg_temp.table_assignment_input;

  insert into pg_temp.table_assignment_input
  select x.seat_number, x.attendee_id, x.event_sponsor_id,
    nullif(trim(x.guest_name), ''), nullif(trim(x.guest_role), ''), coalesce(x.sponsor_host, false)
  from jsonb_to_recordset(coalesce(p_assignments, '[]'::jsonb)) as x(
    seat_number integer,
    attendee_id uuid,
    event_sponsor_id uuid,
    guest_name text,
    guest_role text,
    sponsor_host boolean
  );

  if exists (
    select 1 from pg_temp.table_assignment_input
    where seat_number not between 1 and v_capacity
  ) then raise exception 'Seat numbers must be between 1 and %', v_capacity; end if;
  if exists (
    select seat_number from pg_temp.table_assignment_input
    group by seat_number having count(*) > 1
  ) then raise exception 'A seat may only be assigned once'; end if;
  if exists (
    select attendee_id from pg_temp.table_assignment_input
    where attendee_id is not null
    group by attendee_id having count(*) > 1
  ) then raise exception 'An attendee may only occupy one seat at a table'; end if;
  if exists (
    select 1
    from pg_temp.table_assignment_input x
    left join public.attendees a on a.id = x.attendee_id and a.event_id = v_event_id
    where x.attendee_id is not null and a.id is null
  ) then raise exception 'Every selected attendee must belong to this event'; end if;
  if exists (
    select 1
    from pg_temp.table_assignment_input x
    left join public.event_sponsors es on es.id = x.event_sponsor_id and es.event_id = v_event_id
    where x.event_sponsor_id is not null and es.id is null
  ) then raise exception 'Every selected sponsor must belong to this event'; end if;
  if exists (
    select 1 from pg_temp.table_assignment_input
    where attendee_id is null and event_sponsor_id is null and guest_name is null
  ) then raise exception 'Each saved seat needs an attendee, sponsor or guest name'; end if;

  delete from public.seating_assignments where seating_table_id = p_seating_table_id;
  insert into public.seating_assignments(
    seating_table_id, attendee_id, event_sponsor_id, seat_number, seat_label,
    guest_name, guest_role, occupant_name_snapshot, sponsor_host
  )
  select
    p_seating_table_id,
    x.attendee_id,
    x.event_sponsor_id,
    x.seat_number,
    'Seat ' || x.seat_number,
    x.guest_name,
    x.guest_role,
    case
      when x.attendee_id is not null then nullif(trim(concat_ws(' ', a.title_rank, a.first_name, a.surname)), '')
      when x.event_sponsor_id is not null and x.guest_name is not null then x.guest_name || ' - ' || coalesce(o.short_name, o.organisation_name)
      when x.event_sponsor_id is not null then coalesce(o.short_name, o.organisation_name)
      else x.guest_name
    end,
    x.sponsor_host
  from pg_temp.table_assignment_input x
  left join public.attendees a on a.id = x.attendee_id
  left join public.event_sponsors es on es.id = x.event_sponsor_id
  left join public.organisations o on o.id = es.organisation_id
  order by x.seat_number;

  get diagnostics v_count = row_count;
  return v_count;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.audit_event_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_record_id uuid;
begin
  v_record_id := case when tg_op = 'DELETE' then old.id else new.id end;
  insert into public.audit_log(table_name, record_id, action, actor_id, before_data, after_data)
  values (
    tg_table_name,
    v_record_id,
    lower(tg_op),
    auth.uid(),
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.set_event_operation_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at := now();
  return new;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_get_email_settings(p_event_id uuid)
 RETURNS TABLE(event_id uuid, invoice_from_email text, invoice_sender_name text, invoice_reply_to text, active boolean, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin']);
  return query
  select s.event_id,s.invoice_from_email,s.invoice_sender_name,s.invoice_reply_to,s.active,s.updated_at
  from public.event_email_settings s where s.event_id=p_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.refresh_room_allocation_requests(p_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_count integer;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor, array['admin','protocol','operations']);

  update public.room_allocation_requests
  set source_active=false, updated_at=now(), updated_by=v_actor
  where event_id=p_event_id and source_type='registration';

  insert into public.room_allocation_requests(
    event_id, source_type, source_key, source_active, booking_request_id, attendee_id,
    display_name, email, mobile, category, organisation_name, hotel_preference,
    requested_check_in, requested_check_out, room_share_requested,
    requested_share_with, occupancy_required, room_setup_preference, updated_by
  )
  select
    br.event_id, 'registration', 'booking:' || br.id, true, br.id, br.attendee_id,
    nullif(trim(concat_ws(' ',br.title_rank,br.first_name,br.surname)),''),
    br.email, br.mobile, br.category,
    coalesce(o.short_name,o.organisation_name), br.hotel_preference,
    br.accommodation_from, br.accommodation_to, coalesce(br.room_share_requested,false),
    br.room_share_with, 1,
    case when coalesce(br.room_share_requested,false) then 'Shared room' else null end,
    v_actor
  from public.booking_requests br
  left join public.invitations i on i.id=br.invitation_id
  left join public.organisations o on o.id=i.organisation_id
  where br.event_id=p_event_id
    and coalesce(br.accommodation_required,false)
    and br.status in ('submitted','accepted')
    and (br.attendee_id is null or not exists (
      select 1 from public.stay_charge_periods scp where scp.attendee_id=br.attendee_id
    ))
  on conflict(event_id,source_key) do update set
    source_active=true,
    attendee_id=excluded.attendee_id,
    display_name=excluded.display_name,
    email=excluded.email,
    mobile=excluded.mobile,
    category=excluded.category,
    organisation_name=excluded.organisation_name,
    hotel_preference=excluded.hotel_preference,
    requested_check_in=excluded.requested_check_in,
    requested_check_out=excluded.requested_check_out,
    room_share_requested=excluded.room_share_requested,
    requested_share_with=excluded.requested_share_with,
    room_setup_preference=excluded.room_setup_preference,
    updated_by=v_actor,
    updated_at=now();

  insert into public.room_allocation_requests(
    event_id, source_type, source_key, source_active, stay_charge_period_id, attendee_id,
    display_name, email, mobile, category, organisation_name, hotel_preference,
    requested_check_in, requested_check_out, room_share_requested,
    requested_share_with, occupancy_required, room_setup_preference, updated_by
  )
  select
    a.event_id, 'registration', 'stay:' || scp.id, true, scp.id, a.id,
    nullif(trim(concat_ws(' ',a.title_rank,a.first_name,a.surname)),''),
    a.email, a.mobile, a.category,
    coalesce(o.short_name,o.organisation_name,a.display_company),
    coalesce(nullif(trim(scp.requested_location),''),loc.name),
    coalesce(scp.requested_check_in,scp.actual_check_in,scp.billing_from),
    coalesce(scp.requested_check_out,scp.actual_check_out,scp.billing_to),
    coalesce(scp.requested_room_share,false), scp.requested_share_with, 1,
    case
      when coalesce(scp.requested_room_share,false) then 'Shared room'
      when rt.occupancy_class='single' then 'Single occupancy'
      when rt.occupancy_class in ('twin','sharing') then 'Twin / shared room'
      else null
    end,
    v_actor
  from public.stay_charge_periods scp
  join public.attendees a on a.id=scp.attendee_id
  left join public.accommodation_locations loc on loc.id=scp.location_id
  left join public.room_types rt on rt.id=scp.room_type_id
  left join public.organisations o on o.id=a.organisation_id
  where a.event_id=p_event_id and a.attendance_status <> 'cancelled'
  on conflict(event_id,source_key) do update set
    source_active=true,
    attendee_id=excluded.attendee_id,
    display_name=excluded.display_name,
    email=excluded.email,
    mobile=excluded.mobile,
    category=excluded.category,
    organisation_name=excluded.organisation_name,
    hotel_preference=excluded.hotel_preference,
    requested_check_in=excluded.requested_check_in,
    requested_check_out=excluded.requested_check_out,
    room_share_requested=excluded.room_share_requested,
    requested_share_with=excluded.requested_share_with,
    room_setup_preference=excluded.room_setup_preference,
    updated_by=v_actor,
    updated_at=now();

  select count(*) into v_count
  from public.room_allocation_requests
  where event_id=p_event_id and source_active and allocation_status <> 'cancelled';
  return v_count;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_manual_room_request(p_event_id uuid, p_request_id uuid, p_attendee_id uuid, p_display_name text, p_email text, p_mobile text, p_category text, p_organisation_name text, p_hotel_preference text, p_requested_check_in date, p_requested_check_out date, p_room_share_requested boolean, p_requested_share_with text, p_occupancy_required integer, p_room_setup_preference text, p_priority text, p_protocol_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_name text := nullif(trim(p_display_name),'');
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations']);
  if p_requested_check_in is null or p_requested_check_out is null or p_requested_check_out<=p_requested_check_in then
    raise exception 'Complete valid check-in and check-out dates';
  end if;
  if coalesce(p_occupancy_required,0) not between 1 and 10 then
    raise exception 'Occupancy must be between 1 and 10';
  end if;
  if p_attendee_id is not null then
    select nullif(trim(concat_ws(' ',title_rank,first_name,surname)),'') into v_name
    from public.attendees where id=p_attendee_id and event_id=p_event_id;
    if v_name is null then raise exception 'The selected attendee does not belong to this event'; end if;
  end if;
  if v_name is null then raise exception 'Enter the guest or group name'; end if;

  if p_request_id is null then
    insert into public.room_allocation_requests(
      event_id,source_type,source_key,attendee_id,display_name,email,mobile,category,
      organisation_name,hotel_preference,requested_check_in,requested_check_out,
      room_share_requested,requested_share_with,occupancy_required,
      room_setup_preference,priority,protocol_notes,created_by,updated_by
    ) values (
      p_event_id,'protocol','manual:'||gen_random_uuid(),p_attendee_id,v_name,
      nullif(trim(p_email),''),nullif(trim(p_mobile),''),nullif(trim(p_category),''),
      nullif(trim(p_organisation_name),''),nullif(trim(p_hotel_preference),''),
      p_requested_check_in,p_requested_check_out,coalesce(p_room_share_requested,false),
      nullif(trim(p_requested_share_with),''),p_occupancy_required,
      nullif(trim(p_room_setup_preference),''),coalesce(p_priority,'normal'),
      nullif(trim(p_protocol_notes),''),v_actor,v_actor
    ) returning id into v_id;
  else
    update public.room_allocation_requests set
      attendee_id=p_attendee_id,display_name=v_name,email=nullif(trim(p_email),''),
      mobile=nullif(trim(p_mobile),''),category=nullif(trim(p_category),''),
      organisation_name=nullif(trim(p_organisation_name),''),
      hotel_preference=nullif(trim(p_hotel_preference),''),
      requested_check_in=p_requested_check_in,requested_check_out=p_requested_check_out,
      room_share_requested=coalesce(p_room_share_requested,false),
      requested_share_with=nullif(trim(p_requested_share_with),''),
      occupancy_required=p_occupancy_required,
      room_setup_preference=nullif(trim(p_room_setup_preference),''),
      priority=coalesce(p_priority,'normal'),protocol_notes=nullif(trim(p_protocol_notes),''),
      allocation_status='awaiting_review',updated_by=v_actor,updated_at=now()
    where id=p_request_id and event_id=p_event_id and source_type='protocol'
    returning id into v_id;
    if v_id is null then raise exception 'Manual request not found'; end if;
    update public.hotel_room_allocations set allocation_status='cancelled',updated_at=now()
    where request_id=v_id and allocation_status='confirmed';
  end if;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_room_allocation_suggestions(p_request_id uuid)
 RETURNS TABLE(hotel_room_id uuid, hotel_name text, room_reference text, room_number text, room_type_label text, bed_configuration text, capacity integer, occupied_places integer, available_places integer, current_occupants text, reserved_for text, verified boolean, match_score integer, match_reasons text[], warnings text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_request public.room_allocation_requests%rowtype;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations','read_only']);
  select * into v_request from public.room_allocation_requests where id=p_request_id;
  if v_request.id is null then raise exception 'Allocation request not found'; end if;
  if v_request.requested_check_in is null or v_request.requested_check_out is null then return; end if;

  return query
  with room_load as (
    select
      hr.id,
      coalesce(sum(a.occupancy_count),0)::integer as occupied,
      string_agg(r.display_name,', ' order by r.display_name) as occupants
    from public.hotel_rooms hr
    left join public.hotel_room_allocations a
      on a.hotel_room_id=hr.id
      and a.request_id<>v_request.id
      and a.allocation_status='confirmed'
      and daterange(a.check_in,a.check_out,'[)') && daterange(v_request.requested_check_in,v_request.requested_check_out,'[)')
    left join public.room_allocation_requests r on r.id=a.request_id
    where hr.event_id=v_request.event_id
    group by hr.id
  ), candidates as (
    select hr.*,loc.name as location_name,load.occupied,load.occupants,
      greatest(0,least(100,
        case when v_request.hotel_preference is not null and (
          lower(v_request.hotel_preference) like '%'||lower(loc.name)||'%'
          or lower(loc.name) like '%'||lower(v_request.hotel_preference)||'%'
        ) then 40 else 0 end
        + case when hr.verified then 10 else 0 end
        + case when hr.capacity-load.occupied=v_request.occupancy_required then 20 else 12 end
        + case when v_request.room_setup_preference is not null and (
          lower(coalesce(hr.room_type_label,'')||' '||coalesce(hr.bed_configuration,'')) like
          '%'||lower(split_part(v_request.room_setup_preference,' ',1))||'%'
        ) then 15 else 0 end
        + case
          when hr.reserved_for is null then 8
          when v_request.category is not null and lower(hr.reserved_for) like '%'||lower(split_part(v_request.category,' ',1))||'%' then 15
          else -15
        end
        + case when load.occupied=0 then 5 else 0 end
      ))::integer as score
    from public.hotel_rooms hr
    join public.accommodation_locations loc on loc.id=hr.location_id
    join room_load load on load.id=hr.id
    where hr.event_id=v_request.event_id
      and hr.active and hr.inventory_status='available'
      and hr.available_from<=v_request.requested_check_in
      and hr.available_to>=v_request.requested_check_out
      and hr.capacity-load.occupied>=v_request.occupancy_required
  )
  select
    c.id,c.location_name,c.room_reference,c.room_number,c.room_type_label,
    c.bed_configuration,c.capacity,c.occupied,c.capacity-c.occupied,c.occupants,
    c.reserved_for,c.verified,c.score,
    array_remove(array[
      case when v_request.hotel_preference is not null and (
        lower(v_request.hotel_preference) like '%'||lower(c.location_name)||'%'
        or lower(c.location_name) like '%'||lower(v_request.hotel_preference)||'%'
      ) then 'Requested hotel' end,
      case when c.capacity-c.occupied=v_request.occupancy_required then 'Exact capacity fit' else 'Enough available places' end,
      case when c.verified then 'Inventory verified' end,
      case when c.reserved_for is not null and v_request.category is not null
        and lower(c.reserved_for) like '%'||lower(split_part(v_request.category,' ',1))||'%'
        then 'Reservation group matches' end,
      case when v_request.room_setup_preference is not null and (
        lower(coalesce(c.room_type_label,'')||' '||coalesce(c.bed_configuration,'')) like
        '%'||lower(split_part(v_request.room_setup_preference,' ',1))||'%'
      ) then 'Room setup matches' end
    ]::text[],null),
    array_remove(array[
      case when v_request.hotel_preference is not null and not (
        lower(v_request.hotel_preference) like '%'||lower(c.location_name)||'%'
        or lower(c.location_name) like '%'||lower(v_request.hotel_preference)||'%'
      ) then 'Different from requested hotel' end,
      case when not c.verified then 'Room details need Protocol verification' end,
      case when c.reserved_for is not null and (
        v_request.category is null or lower(c.reserved_for) not like '%'||lower(split_part(v_request.category,' ',1))||'%'
      ) then 'Reserved group differs: '||c.reserved_for end,
      case when c.occupied>0 then 'Already shared with: '||c.occupants end
    ]::text[],null)
  from candidates c
  order by c.score desc,c.location_name,c.sort_order,c.room_reference
  limit 30;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.confirm_room_allocation(p_request_id uuid, p_hotel_room_id uuid, p_check_in date, p_check_out date, p_occupancy_count integer, p_decision_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_request public.room_allocation_requests%rowtype;
  v_room public.hotel_rooms%rowtype;
  v_hotel_name text;
  v_occupied integer;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations']);
  select * into v_request from public.room_allocation_requests where id=p_request_id for update;
  if v_request.id is null or not v_request.source_active then raise exception 'Active allocation request not found'; end if;
  select * into v_room from public.hotel_rooms where id=p_hotel_room_id for update;
  if v_room.id is null or v_room.event_id<>v_request.event_id then raise exception 'Room is not part of this event'; end if;
  if not v_room.active or v_room.inventory_status<>'available' then raise exception 'Room is not available for allocation'; end if;
  if p_check_in is null or p_check_out is null or p_check_out<=p_check_in then raise exception 'Complete valid check-in and check-out dates'; end if;
  if p_check_in<v_room.available_from or p_check_out>v_room.available_to then raise exception 'Stay falls outside this room''s available dates'; end if;
  if coalesce(p_occupancy_count,0) not between 1 and 10 then raise exception 'Occupancy must be between 1 and 10'; end if;

  select coalesce(sum(occupancy_count),0)::integer into v_occupied
  from public.hotel_room_allocations
  where hotel_room_id=p_hotel_room_id and request_id<>p_request_id
    and allocation_status='confirmed'
    and daterange(check_in,check_out,'[)') && daterange(p_check_in,p_check_out,'[)');
  if v_occupied+p_occupancy_count>v_room.capacity then
    raise exception 'Only % place(s) remain in this room for those dates',greatest(v_room.capacity-v_occupied,0);
  end if;
  select name into v_hotel_name from public.accommodation_locations where id=v_room.location_id;

  insert into public.hotel_room_allocations(
    event_id,request_id,hotel_room_id,attendee_id,check_in,check_out,occupancy_count,
    allocation_status,hotel_name_snapshot,room_reference_snapshot,decision_notes,decided_by,decided_at
  ) values (
    v_request.event_id,v_request.id,v_room.id,v_request.attendee_id,p_check_in,p_check_out,
    p_occupancy_count,'confirmed',v_hotel_name,v_room.room_reference,
    nullif(trim(p_decision_notes),''),v_actor,now()
  )
  on conflict(request_id) do update set
    hotel_room_id=excluded.hotel_room_id,attendee_id=excluded.attendee_id,
    check_in=excluded.check_in,check_out=excluded.check_out,
    occupancy_count=excluded.occupancy_count,allocation_status='confirmed',
    hotel_name_snapshot=excluded.hotel_name_snapshot,
    room_reference_snapshot=excluded.room_reference_snapshot,
    decision_notes=excluded.decision_notes,decided_by=v_actor,decided_at=now(),updated_at=now()
  returning id into v_id;

  update public.room_allocation_requests set
    allocation_status='allocated',updated_by=v_actor,updated_at=now()
  where id=v_request.id;
  if v_request.stay_charge_period_id is not null then
    update public.stay_charge_periods set location_id=v_room.location_id,updated_at=now()
    where id=v_request.stay_charge_period_id;
  end if;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.cancel_room_allocation(p_request_id uuid, p_reason text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations']);
  update public.hotel_room_allocations set
    allocation_status='cancelled',decision_notes=concat_ws(E'\n',decision_notes,nullif(trim(p_reason),'')),
    decided_by=v_actor,decided_at=now(),updated_at=now()
  where request_id=p_request_id and allocation_status='confirmed';
  update public.room_allocation_requests set
    allocation_status='awaiting_review',updated_by=v_actor,updated_at=now()
  where id=p_request_id;
  return found;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_registration_v2_legacy_v31(p_event_id uuid, p_invitation_code text, p_submitted_on_behalf boolean, p_submitter_name text, p_submitter_email text, p_attendee_email text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_submission_id uuid;
  v_invitation_id uuid;
  v_invitation public.invitations%rowtype;
  v_invitation_token uuid;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_category text;
  v_sponsor_name text;
  v_accommodation_required boolean;
  v_share_room boolean;
  v_lift_required boolean;
  v_lessons_required boolean;
  v_from date;
  v_to date;
  v_first_ski date;
  v_last_ski date;
  v_date_of_birth date;
  v_arrival_method text;
  v_departure_method text;
  v_arrival_transfer text;
  v_departure_transfer text;
  v_attendee_email text := lower(trim(coalesce(p_attendee_email, '')));
  v_submitter_email text := lower(trim(coalesce(p_submitter_email, '')));
  v_datetime_pattern text := '^2027-(01-(27|28|29|30|31)|02-(0[1-9]))T([01][0-9]|2[0-3]):[0-5][0-9]$';
begin
  if not exists (select 1 from public.events e where e.id = p_event_id) then
    raise exception 'This event is not available for registration.';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'The registration details are invalid.';
  end if;
  if coalesce((v_payload ->> 'privacy_acknowledged')::boolean, false) is not true then
    raise exception 'Please read and accept the privacy notice.';
  end if;
  if nullif(trim(v_payload ->> 'first_name'), '') is null
     or nullif(trim(v_payload ->> 'surname'), '') is null then
    raise exception 'First name and surname are required.';
  end if;
  if nullif(trim(v_payload ->> 'title_rank'), '') is null
     or nullif(trim(v_payload ->> 'role'), '') is null then
    raise exception 'Rank or title and role or appointment are required.';
  end if;
  if nullif(trim(v_payload ->> 'mobile'), '') is null then
    raise exception 'Enter an attendee mobile number for safety and emergency procedures.';
  end if;
  if v_attendee_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid attendee email address.';
  end if;
  if v_submitter_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid submitter email address.';
  end if;
  if nullif(trim(p_submitter_name), '') is null then
    raise exception 'Submitter name is required.';
  end if;

  v_category := nullif(trim(v_payload ->> 'category'), '');
  if v_category = 'Military VIP' then v_category := 'Winter Sports Ambassador'; end if;
  if v_category is null or v_category not in (
    'Winter Sports Ambassador','Military Guest','Sponsor','Sponsor Guest',
    'Royal Party','Proton','Committee','Committee Guest','Protocol',
    'Protocol Intern','Hill Team','Other'
  ) then
    raise exception 'Choose a valid attendee category.';
  end if;

  if nullif(trim(p_invitation_code), '') is not null then
    begin
      v_invitation_token := trim(p_invitation_code)::uuid;
    exception when invalid_text_representation then
      raise exception 'This registration invitation is not valid.';
    end;
    select i.* into v_invitation
    from public.invitations i
    where i.event_id = p_event_id
      and i.invitation_token = v_invitation_token
      and coalesce(i.invitation_status, 'pending') not in ('cancelled', 'revoked')
    for update;
    if not found then raise exception 'This registration invitation is not valid.'; end if;
    if lower(trim(v_invitation.invitee_email)) <> v_attendee_email then
      raise exception 'Use the attendee email address to which this invitation was sent.';
    end if;
    v_invitation_id := v_invitation.id;
    v_category := case when v_invitation.category = 'Military VIP' then 'Winter Sports Ambassador'
                       else coalesce(nullif(trim(v_invitation.category), ''), v_category) end;
    select o.organisation_name into v_sponsor_name
    from public.organisations o where o.id = v_invitation.organisation_id and o.active;
  elsif v_category in ('Sponsor','Sponsor Guest') then
    select o.organisation_name into v_sponsor_name
    from public.event_sponsors es
    join public.organisations o on o.id = es.organisation_id
    where es.event_id = p_event_id and es.active and o.active
      and lower(o.organisation_name) = lower(trim(v_payload ->> 'sponsor_name'))
    limit 1;
    if v_sponsor_name is null then
      raise exception 'Choose a sponsor from the current sponsor list.';
    end if;
  end if;

  if v_category in ('Winter Sports Ambassador','Committee')
     and coalesce(v_payload ->> 'service', '') not in ('Army','Navy','RAF','Civil Service','Other') then
    raise exception 'Choose the attendee service.';
  end if;
  if v_category = 'Hill Team'
     and coalesce(v_payload ->> 'discipline', '') not in ('Alpine','Snowboard','Telemark','Other') then
    raise exception 'Choose the Hill Team or Race Committee discipline.';
  end if;

  v_accommodation_required := coalesce((v_payload ->> 'accommodation_required')::boolean, false);
  if v_category in ('Protocol','Protocol Intern','Hill Team') then
    v_accommodation_required := true;
  end if;
  if v_accommodation_required then
    begin
      v_from := nullif(v_payload ->> 'accommodation_from', '')::date;
      v_to := nullif(v_payload ->> 'accommodation_to', '')::date;
    exception when invalid_datetime_format then
      raise exception 'Choose valid accommodation dates.';
    end;
    if v_from is null or v_to is null then raise exception 'Choose both accommodation dates.'; end if;
    if v_from < date '2027-01-28' or v_from > date '2027-02-05'
       or v_to > date '2027-02-06' or v_to <= v_from then
      raise exception 'Accommodation end date must be after the start date and within the offered event period.';
    end if;
    if v_from = date '2027-01-28' and v_category not in ('Protocol','Protocol Intern') then
      raise exception 'Thursday 28 January accommodation is available only to Protocol.';
    end if;
    if v_from = date '2027-01-29' and v_category not in ('Protocol','Protocol Intern','Hill Team') then
      raise exception 'Friday 29 January accommodation is available only to Protocol and the Hill Team or Race Committee.';
    end if;
    if v_category in ('Sponsor','Sponsor Guest') and v_from not in (date '2027-01-30', date '2027-02-03') then
      raise exception 'Sponsors can start accommodation only on Saturday 30 January or Wednesday 3 February.';
    end if;
    if v_category not in ('Protocol','Protocol Intern','Hill Team') then
      if coalesce(v_payload ->> 'hotel_preference', '') not in ('Eterlou','Chaudanne','Savoy','Chalet','No preference') then
        raise exception 'Choose a valid hotel preference.';
      end if;
      if v_category <> 'Proton' and v_payload ->> 'hotel_preference' = 'Chalet' then
        raise exception 'Chalet accommodation is available only to the Proton category.';
      end if;
    end if;
    v_share_room := coalesce((v_payload ->> 'share_room')::boolean, false);
    if v_share_room and (
      nullif(trim(v_payload ->> 'sharing_with'), '') is null
      or coalesce(v_payload ->> 'room_sharing_option', '') not in ('Double room','Twin room')
    ) then
      raise exception 'Enter who the attendee will share with and choose double or twin room.';
    end if;
    if not v_share_room then
      v_payload := v_payload || jsonb_build_object('sharing_with', null, 'room_sharing_option', null);
    end if;
    if v_category in ('Sponsor','Sponsor Guest') then
      v_payload := v_payload || jsonb_build_object('dinners_required', 'Dinner with event guests each night');
    elsif v_category not in ('Protocol','Protocol Intern','Hill Team')
      and coalesce(v_payload ->> 'dinners_required', '') not in ('Dinner with event guests each night','B&B only / no event dinner') then
      raise exception 'Choose whether the attendee requires the event dinners.';
    end if;
  else
    v_payload := v_payload || jsonb_build_object(
      'hotel_preference', null, 'accommodation_from', null, 'accommodation_to', null,
      'share_room', false, 'sharing_with', null, 'room_sharing_option', null,
      'dinners_required', null, 'dietary_requirements', null
    );
  end if;

  v_arrival_method := nullif(trim(v_payload ->> 'arrival_method'), '');
  v_departure_method := nullif(trim(v_payload ->> 'departure_method'), '');
  if v_arrival_method not in ('Flight','Self Drive','Other')
     or v_departure_method not in ('Flight','Self Drive','Other') then
    raise exception 'Choose a valid arrival and departure method.';
  end if;
  if v_arrival_method = 'Other' and nullif(trim(v_payload ->> 'arrival_method_other'), '') is null then
    raise exception 'Describe the other arrival method.';
  end if;
  if v_departure_method = 'Other' and nullif(trim(v_payload ->> 'departure_method_other'), '') is null then
    raise exception 'Describe the other departure method.';
  end if;

  if v_arrival_method = 'Flight' then
    if nullif(trim(v_payload ->> 'arrival_airport_station'), '') is null
       or nullif(trim(v_payload ->> 'arrival_number'), '') is null then
      raise exception 'Enter the arrival airport and flight number.';
    end if;
    if coalesce(v_payload ->> 'arrival_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose a valid arrival flight date and time.';
    end if;
    v_arrival_transfer := nullif(trim(v_payload ->> 'arrival_transfer_option'), '');
    if v_arrival_transfer is null or v_arrival_transfer not in (
      'Not required','Required - on Thu 28 Jan 27 (Protocol only)',
      'Required - on Fri 29 Jan 27 (Hill Teams only)',
      'Required - bus on Sat 30 Jan 27 @ 11:30 (flight arrivals before 10:05)',
      'Required - bus on Sat 30 Jan 27 @ 14:30 (flight arrivals before 13:15)',
      'Required - bus on Wed 3 Feb 27 @ 11:00','Required - bus on Wed 3 Feb 27 @ 15:00',
      'Required - special transfer (this must be arranged with a UKAFWSA representative before booking)'
    ) then raise exception 'Choose a valid arrival transfer option.'; end if;
    if v_arrival_transfer like 'Required - special transfer%'
       and coalesce(v_payload ->> 'arrival_special_transfer_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose the agreed special arrival transfer date and time.';
    end if;
    v_payload := v_payload || jsonb_build_object('arrival_resort_datetime', null);
  else
    if coalesce(v_payload ->> 'arrival_resort_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose a valid expected arrival date and time in Méribel.';
    end if;
    v_payload := v_payload || jsonb_build_object(
      'arrival_airport_station', null, 'arrival_number', null, 'arrival_datetime', null,
      'arrival_transfer', false, 'arrival_transfer_option', 'Not required',
      'arrival_special_transfer_datetime', null
    );
  end if;

  if v_departure_method = 'Flight' then
    if nullif(trim(v_payload ->> 'departure_airport_station'), '') is null
       or nullif(trim(v_payload ->> 'departure_number'), '') is null then
      raise exception 'Enter the departure airport and flight number.';
    end if;
    if coalesce(v_payload ->> 'departure_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose a valid departure flight date and time.';
    end if;
    v_departure_transfer := nullif(trim(v_payload ->> 'departure_transfer_option'), '');
    if v_departure_transfer is null or v_departure_transfer not in (
      'Not required','Required - on Wed 3 Feb 27 @ 07:00','Required - on Wed 3 Feb 27 @ 10:00',
      'Required - on Sat 6 Feb 27 @ 05:00 (flight departures after 09:00)',
      'Required - on Sat 6 Feb 27 @ 08:00 (flight departures after 12:00)',
      'Required - special transfer (this must be arranged with a UKAFWSA representative before booking)'
    ) then raise exception 'Choose a valid departure transfer option.'; end if;
    if v_departure_transfer like 'Required - special transfer%'
       and coalesce(v_payload ->> 'departure_special_transfer_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose the agreed special departure transfer date and time.';
    end if;
    v_payload := v_payload || jsonb_build_object('departure_resort_datetime', null);
  else
    if coalesce(v_payload ->> 'departure_resort_datetime', '') !~ v_datetime_pattern then
      raise exception 'Choose a valid departure date and time from Méribel.';
    end if;
    v_payload := v_payload || jsonb_build_object(
      'departure_airport_station', null, 'departure_number', null, 'departure_datetime', null,
      'departure_transfer', false, 'departure_transfer_option', 'Not required',
      'departure_special_transfer_datetime', null
    );
  end if;

  if v_category = 'Hill Team' then
    v_lift_required := false;
    v_lessons_required := false;
  else
    v_lift_required := coalesce((v_payload ->> 'lift_pass_required')::boolean, false);
    v_lessons_required := coalesce((v_payload ->> 'lessons_required')::boolean, false);
  end if;
  if v_lift_required then
    begin
      v_first_ski := nullif(v_payload ->> 'first_ski_day', '')::date;
      v_last_ski := nullif(v_payload ->> 'last_ski_day', '')::date;
      v_date_of_birth := nullif(v_payload ->> 'date_of_birth', '')::date;
    exception when invalid_datetime_format then
      raise exception 'Choose valid ski dates and date of birth.';
    end;
    if v_first_ski is null or v_last_ski is null or v_date_of_birth is null then
      raise exception 'First ski day, last ski day and date of birth are required for a lift pass.';
    end if;
    if v_first_ski < date '2027-01-29' or v_last_ski > date '2027-02-05' or v_last_ski < v_first_ski then
      raise exception 'Choose valid first and last ski days.';
    end if;
    if v_first_ski = date '2027-01-29' and v_category not in ('Protocol','Protocol Intern') then
      raise exception 'Friday 29 January skiing is available only to Protocol.';
    end if;
  else
    v_payload := v_payload || jsonb_build_object(
      'first_ski_day', null, 'last_ski_day', null, 'date_of_birth', null
    );
  end if;

  if v_lessons_required then
    if coalesce(v_payload ->> 'lesson_type', '') not in (
      'Skiing / Private lesson / Basic level','Skiing / Private lesson / Intermediate level',
      'Skiing / Group lesson / Basic level','Skiing / Group lesson / Intermediate level',
      'Snowboard / Private lesson / Basic level','Snowboard / Private lesson / Intermediate level',
      'Snowboard / Group lesson / Basic level','Snowboard / Group lesson / Intermediate level'
    ) then raise exception 'Choose a valid lesson type.'; end if;
    if jsonb_typeof(v_payload -> 'lesson_dates') <> 'array'
       or jsonb_array_length(v_payload -> 'lesson_dates') = 0
       or exists (
         select 1 from jsonb_array_elements_text(v_payload -> 'lesson_dates') d(value)
         where d.value not in ('2027-01-30','2027-01-31','2027-02-01','2027-02-02','2027-02-03','2027-02-04','2027-02-05')
       ) then raise exception 'Choose one or more valid lesson dates.'; end if;
  else
    v_payload := v_payload || jsonb_build_object('lesson_type', null, 'lesson_dates', '[]'::jsonb);
  end if;

  v_payload := (v_payload - 'boot_size' - 'proxy_title_rank' - 'proxy_first_name' - 'proxy_surname' - 'proxy_email')
    || jsonb_build_object(
      'category', v_category,
      'email', v_attendee_email,
      'sponsor_name', v_sponsor_name,
      'accommodation_required', v_accommodation_required,
      'lift_pass_required', v_lift_required,
      'carre_neige_required', v_lift_required,
      'lessons_required', v_lessons_required,
      'equipment_hire_required', coalesce((v_payload ->> 'equipment_hire_required')::boolean, false),
      'boot_size', null
    );
  if v_category <> 'Hill Team' then v_payload := v_payload || jsonb_build_object('discipline', null); end if;
  if v_category not in ('Winter Sports Ambassador','Committee') then v_payload := v_payload || jsonb_build_object('service', null); end if;

  insert into public.intake_submissions(
    event_id, source, invitation_id, invitation_code, submitted_on_behalf,
    submitter_name, submitter_email, attendee_email, processing_status,
    mapping_version, raw_payload
  ) values (
    p_event_id, 'web', v_invitation_id, nullif(trim(p_invitation_code), ''),
    coalesce(p_submitted_on_behalf, false), trim(p_submitter_name),
    v_submitter_email, v_attendee_email, 'pending', 'web_v3', v_payload
  ) returning id into v_submission_id;

  if v_invitation_id is not null then
    update public.invitations
    set invitation_status = 'responded', responded_at = coalesce(responded_at, now())
    where id = v_invitation_id;
  end if;

  return v_submission_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_list_staff_access()
 RETURNS TABLE(access_id uuid, email text, display_name text, app_role text, active boolean, user_id uuid, account_created_at timestamp with time zone, last_sign_in_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin']);
  return query
  select
    a.id,a.email,coalesce(p.display_name,a.display_name),a.app_role,a.active,
    u.id,u.created_at,u.last_sign_in_at,a.created_at,a.updated_at
  from private.staff_access_allowlist a
  left join auth.users u on lower(u.email)=a.email
  left join public.profiles p on p.id=u.id
  order by a.active desc,a.app_role,a.email;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_save_email_settings(p_event_id uuid, p_invoice_from_email text, p_invoice_sender_name text, p_invoice_reply_to text, p_active boolean)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_from text:=nullif(lower(trim(p_invoice_from_email)),'');
  v_reply text:=nullif(lower(trim(p_invoice_reply_to)),'');
  v_name text:=nullif(trim(p_invoice_sender_name),'');
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin']);
  if not exists(select 1 from public.events where id=p_event_id) then raise exception 'Event not found'; end if;
  if v_from is null or length(v_from)>320 or v_from !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid invoice sender email address';
  end if;
  if v_reply is not null and (length(v_reply)>320 or v_reply !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') then
    raise exception 'Enter a valid reply-to email address';
  end if;
  if v_name is null or length(v_name)>100 then raise exception 'Enter a sender name of 100 characters or fewer'; end if;

  insert into public.event_email_settings(
    event_id,invoice_from_email,invoice_sender_name,invoice_reply_to,active,updated_by
  ) values (p_event_id,v_from,v_name,v_reply,coalesce(p_active,false),v_actor)
  on conflict(event_id) do update set
    invoice_from_email=excluded.invoice_from_email,
    invoice_sender_name=excluded.invoice_sender_name,
    invoice_reply_to=excluded.invoice_reply_to,
    active=excluded.active,
    updated_by=v_actor,
    updated_at=now();
  return p_event_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.create_protocol_attendee(p_event_id uuid, p_title_rank text, p_first_name text, p_surname text, p_category text, p_organisation_id uuid, p_display_company text, p_email text, p_mobile text, p_service text, p_position_role text, p_protocol_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_email text := nullif(lower(trim(coalesce(p_email,''))), '');
  v_first_name text := nullif(trim(coalesce(p_first_name,'')), '');
  v_surname text := nullif(trim(coalesce(p_surname,'')), '');
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations']);

  if not exists(select 1 from public.events where id=p_event_id) then
    raise exception 'Event not found';
  end if;
  if v_first_name is null or v_surname is null then
    raise exception 'First name and surname are required';
  end if;
  if v_email is not null and (
    length(v_email)>320 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  ) then
    raise exception 'Enter a valid email address';
  end if;
  if p_organisation_id is not null and not exists(
    select 1 from public.organisations where id=p_organisation_id and active
  ) then
    raise exception 'Choose a valid organisation';
  end if;
  if v_email is not null and exists(
    select 1 from public.attendees
    where event_id=p_event_id and lower(email)=v_email
  ) then
    raise exception 'A person with this email already exists. Open their existing attendee record instead.';
  end if;

  insert into public.attendees(
    event_id,attendance_status,category,organisation_id,display_company,
    title_rank,first_name,surname,email,mobile,service,position_role,
    protocol_notes,record_source,source_created_by,source_last_updated_at
  ) values (
    p_event_id,'expected',coalesce(nullif(trim(p_category),''),'Other'),
    p_organisation_id,nullif(trim(p_display_company),''),
    nullif(trim(p_title_rank),''),v_first_name,v_surname,v_email,
    nullif(trim(p_mobile),''),nullif(trim(p_service),''),
    nullif(trim(p_position_role),''),nullif(trim(p_protocol_notes),''),
    'protocol_manual',v_actor,now()
  ) returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION private.current_user_matches_announcement_audience(p_event_id uuid, p_audience text[])
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if 'all' = any(coalesce(p_audience, array['all'::text])) then
    return true;
  end if;

  if 'staff' = any(p_audience) and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active
      and p.app_role <> 'attendee'
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.profiles p
    join public.attendees a on a.id = p.attendee_id
    where p.id = auth.uid()
      and p.active
      and a.event_id = p_event_id
      and (
        'attendees' = any(p_audience)
        or ('category:' || lower(trim(coalesce(a.category, '')))) = any(p_audience)
        or ('service:' || lower(trim(coalesce(a.service, '')))) = any(p_audience)
      )
  ) or exists (
    select 1
    from public.user_attendee_links l
    join public.attendees a on a.id = l.attendee_id
    where l.user_id = auth.uid()
      and l.event_id = p_event_id
      and a.event_id = p_event_id
      and (
        'attendees' = any(p_audience)
        or ('category:' || lower(trim(coalesce(a.category, '')))) = any(p_audience)
        or ('service:' || lower(trim(coalesce(a.service, '')))) = any(p_audience)
      )
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_operational_overview(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_event_name text;
  v_start_date date;
  v_end_date date;
  v_billing_confirmed boolean := false;
  v_attendees integer := 0;
  v_pending_intake integer := 0;
  v_follow_up_intake integer := 0;
  v_error_intake integer := 0;
  v_room_awaiting integer := 0;
  v_room_waitlist integer := 0;
  v_lift_unconfirmed integer := 0;
  v_travel_unconfirmed integer := 0;
  v_transfer_unassigned integer := 0;
  v_transfer_runs_incomplete integer := 0;
  v_finance_ready integer := 0;
  v_finance_blocked integer := 0;
  v_invoice_open integer := 0;
  v_invoice_approved integer := 0;
  v_invoice_unpaid integer := 0;
  v_invoice_overdue integer := 0;
  v_sponsors integer := 0;
  v_sponsors_prospective integer := 0;
  v_sponsor_invites_pending integer := 0;
  v_sponsor_rooms_remaining integer := 0;
  v_sponsor_overallocated integer := 0;
  v_rates_approved integer := 0;
  v_rates_pending integer := 0;
  v_rooms_active integer := 0;
  v_rooms_unverified integer := 0;
  v_sender_saved boolean := false;
  v_push_configured boolean := false;
  v_push_devices integer := 0;
  v_notification_failures integer := 0;
  v_staff_active integer := 0;
  v_schedule_published integer := 0;
  v_venues_published integer := 0;
  v_results_published integer := 0;
  v_media_published integer := 0;
  v_table_plans_published integer := 0;
  v_transfers_published integer := 0;
  v_open_actions integer := 0;
begin
  if v_actor is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform private.require_actor_role(
    v_actor,
    array['admin','sponsor_manager','protocol','finance','operations','content_manager','read_only']
  );

  select e.name, e.start_date, e.end_date, e.billing_configuration_confirmed
    into v_event_name, v_start_date, v_end_date, v_billing_confirmed
  from public.events e
  where e.id = p_event_id;

  if v_event_name is null then
    raise exception 'Event not found';
  end if;

  select count(*) into v_attendees
  from public.attendees a
  where a.event_id = p_event_id
    and coalesce(a.attendance_status, 'expected') not in ('declined','cancelled');

  select
    count(*) filter (where s.processing_status = 'pending'),
    count(*) filter (where s.processing_status = 'review_required'),
    count(*) filter (where s.processing_status = 'error')
  into v_pending_intake, v_follow_up_intake, v_error_intake
  from public.intake_submissions s
  where s.event_id = p_event_id;

  select
    count(*) filter (where r.allocation_status = 'awaiting_review'),
    count(*) filter (where r.allocation_status = 'waitlist')
  into v_room_awaiting, v_room_waitlist
  from public.room_allocation_requests r
  where r.event_id = p_event_id and r.source_active;

  select count(*) into v_lift_unconfirmed
  from public.lift_passes l
  join public.attendees a on a.id = l.attendee_id
  where a.event_id = p_event_id
    and coalesce(a.attendance_status, 'expected') not in ('declined','cancelled')
    and l.required
    and not l.protocol_confirmed;

  select count(*) into v_travel_unconfirmed
  from public.travel_records t
  join public.attendees a on a.id = t.attendee_id
  where a.event_id = p_event_id
    and coalesce(a.attendance_status, 'expected') not in ('declined','cancelled')
    and not t.protocol_confirmed
    and (
      t.method_of_transport is not null or t.airport_station is not null
      or t.flight_travel_number is not null or t.travel_datetime is not null
      or t.resort_datetime is not null or t.transfer_requested
    );

  select count(*) into v_transfer_unassigned
  from public.travel_records t
  join public.attendees a on a.id = t.attendee_id
  where a.event_id = p_event_id
    and coalesce(a.attendance_status, 'expected') not in ('declined','cancelled')
    and t.transfer_requested
    and t.protocol_confirmed
    and not exists (
      select 1
      from public.transfer_passengers tp
      join public.transfer_runs tr on tr.id = tp.transfer_run_id
      where tp.attendee_id = t.attendee_id
        and tr.event_id = p_event_id
        and tr.direction = t.direction
        and tr.status <> 'cancelled'
    );

  select count(*) into v_transfer_runs_incomplete
  from public.transfer_runs tr
  where tr.event_id = p_event_id
    and tr.status <> 'cancelled'
    and (
      tr.status = 'planned'
      or nullif(trim(coalesce(tr.driver_name, '')), '') is null
      or nullif(trim(coalesce(tr.driver_mobile, '')), '') is null
      or nullif(trim(coalesce(tr.lead_traveller_name, '')), '') is null
      or nullif(trim(coalesce(tr.lead_traveller_mobile, '')), '') is null
      or not exists (
        select 1 from public.transfer_passengers tp where tp.transfer_run_id = tr.id
      )
      or (
        tr.capacity is not null
        and (select count(*) from public.transfer_passengers tp where tp.transfer_run_id = tr.id) > tr.capacity
      )
    );

  select
    count(*) filter (where r.ready_for_invoice),
    count(*) filter (where not r.ready_for_invoice)
  into v_finance_ready, v_finance_blocked
  from public.v_invoice_readiness r
  where r.event_id = p_event_id;

  select
    count(*) filter (where i.status in ('draft','awaiting_billing_update','ready_for_review')),
    count(*) filter (where i.status = 'approved'),
    count(*) filter (where i.status = 'issued'),
    count(*) filter (where i.status = 'issued' and i.due_date is not null and i.due_date < current_date)
  into v_invoice_open, v_invoice_approved, v_invoice_unpaid, v_invoice_overdue
  from public.invoices i
  where i.event_id = p_event_id;

  select
    count(*) filter (where s.active),
    count(*) filter (where s.active and s.sponsor_status = 'prospective')
  into v_sponsors, v_sponsors_prospective
  from public.event_sponsors s
  where s.event_id = p_event_id;

  select count(*) into v_sponsor_invites_pending
  from public.invitations i
  where i.event_id = p_event_id
    and coalesce(i.invitation_status, 'draft') not in ('accepted','declined','rejected','cancelled');

  select
    coalesce(sum(greatest(s.remaining_rooms, 0)), 0)::integer,
    count(*) filter (where s.over_allocation)
  into v_sponsor_rooms_remaining, v_sponsor_overallocated
  from public.v_sponsor_room_allocation s
  where s.event_id = p_event_id;

  select
    count(*) filter (where r.active and r.status = 'approved'),
    count(*) filter (where r.active and r.status <> 'approved')
  into v_rates_approved, v_rates_pending
  from public.rate_card r
  where r.event_id = p_event_id;

  select
    count(*) filter (where r.active and r.inventory_status = 'available'),
    count(*) filter (where r.active and r.inventory_status = 'available' and not r.verified)
  into v_rooms_active, v_rooms_unverified
  from public.hotel_rooms r
  where r.event_id = p_event_id;

  select exists (
    select 1 from public.event_email_settings e
    where e.event_id = p_event_id and e.active
      and nullif(trim(coalesce(e.invoice_from_email, '')), '') is not null
  ) into v_sender_saved;

  select exists (
    select 1 from public.push_configuration p
    where p.active
      and nullif(trim(coalesce(p.vapid_public_key, '')), '') is not null
      and nullif(trim(coalesce(p.vapid_private_key, '')), '') is not null
  ) into v_push_configured;

  select count(*) into v_push_devices
  from public.push_subscriptions p
  where p.active;

  select coalesce(sum(n.failure_count), 0)::integer into v_notification_failures
  from public.notification_deliveries n
  where n.event_id = p_event_id
    and n.requested_at >= now() - interval '30 days';

  select count(*) into v_staff_active
  from public.profiles p
  where p.active and p.app_role <> 'attendee';

  select count(*) into v_schedule_published
  from public.schedule_items s where s.event_id = p_event_id and s.published;
  select count(*) into v_venues_published
  from public.venues v where v.event_id = p_event_id and v.active and v.published;
  select count(*) into v_results_published
  from public.race_results r where r.event_id = p_event_id and r.published;
  select count(*) into v_media_published
  from public.event_media m where m.event_id = p_event_id and m.published;
  select count(*) into v_table_plans_published
  from public.table_plans t where t.event_id = p_event_id and t.published;
  select count(*) into v_transfers_published
  from public.transfer_runs t
  where t.event_id = p_event_id and t.published and t.status <> 'cancelled';

  v_open_actions :=
    v_pending_intake + v_follow_up_intake + v_error_intake
    + v_room_awaiting + v_room_waitlist + v_lift_unconfirmed
    + v_travel_unconfirmed + v_transfer_unassigned + v_transfer_runs_incomplete
    + v_finance_blocked + v_invoice_open + v_invoice_approved + v_invoice_overdue
    + v_sponsors_prospective + v_sponsor_invites_pending + v_sponsor_overallocated
    + case when not v_billing_confirmed then 1 else 0 end
    + case when v_rates_approved = 0 or v_rates_pending > 0 then 1 else 0 end
    + case when v_rooms_active = 0 or v_rooms_unverified > 0 then 1 else 0 end
    + case when not v_sender_saved then 1 else 0 end
    + case when not v_push_configured then 1 else 0 end;

  return jsonb_build_object(
    'generated_at', now(),
    'event', jsonb_build_object(
      'name', v_event_name, 'start_date', v_start_date, 'end_date', v_end_date
    ),
    'headline', jsonb_build_object(
      'attendees', v_attendees, 'open_actions', v_open_actions,
      'ready_for_invoice', v_finance_ready, 'issued_unpaid', v_invoice_unpaid
    ),
    'registration', jsonb_build_object(
      'pending', v_pending_intake, 'follow_up', v_follow_up_intake, 'errors', v_error_intake
    ),
    'protocol', jsonb_build_object(
      'room_awaiting', v_room_awaiting, 'room_waitlist', v_room_waitlist,
      'lift_pass_unconfirmed', v_lift_unconfirmed, 'travel_unconfirmed', v_travel_unconfirmed,
      'transfers_unassigned', v_transfer_unassigned, 'incomplete_runs', v_transfer_runs_incomplete
    ),
    'finance', jsonb_build_object(
      'blocked', v_finance_blocked, 'ready', v_finance_ready, 'open_invoices', v_invoice_open,
      'approved_not_issued', v_invoice_approved, 'issued_unpaid', v_invoice_unpaid,
      'overdue', v_invoice_overdue
    ),
    'sponsors', jsonb_build_object(
      'total', v_sponsors, 'prospective', v_sponsors_prospective,
      'pending_invitations', v_sponsor_invites_pending,
      'rooms_remaining', v_sponsor_rooms_remaining, 'overallocated', v_sponsor_overallocated
    ),
    'readiness', jsonb_build_object(
      'billing_confirmed', v_billing_confirmed,
      'rates_approved', v_rates_approved, 'rates_pending', v_rates_pending,
      'hotel_rooms', v_rooms_active, 'hotel_rooms_unverified', v_rooms_unverified,
      'sender_saved', v_sender_saved, 'push_configured', v_push_configured,
      'active_notification_devices', v_push_devices,
      'notification_failures_30d', v_notification_failures,
      'active_staff', v_staff_active
    ),
    'content', jsonb_build_object(
      'programme', v_schedule_published, 'venues', v_venues_published,
      'results', v_results_published, 'media', v_media_published,
      'table_plans', v_table_plans_published, 'transfers', v_transfers_published
    )
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_registration_invitation_v2(p_event_id uuid, p_invitation_code text)
 RETURNS TABLE(sponsor_name text, invitee_email text, invitee_name text, category text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_token uuid;
begin
  begin
    v_token := nullif(trim(p_invitation_code), '')::uuid;
  exception when invalid_text_representation then
    return;
  end;

  return query
  select
    o.organisation_name,
    i.invitee_email,
    i.invitee_name,
    case when i.category = 'Military VIP' then 'Winter Sports Ambassador'
         else coalesce(i.category, 'Sponsor Guest') end
  from public.invitations i
  left join public.organisations o on o.id = i.organisation_id
  join public.event_sponsors es
    on es.event_id = i.event_id
   and es.organisation_id = i.organisation_id
   and es.active
  where i.event_id = p_event_id
    and i.invitation_token = v_token
    and coalesce(i.invitation_status, 'pending') not in ('cancelled', 'revoked')
  limit 1;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_registration_sponsors_v2(p_event_id uuid)
 RETURNS TABLE(sponsor_name text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select o.organisation_name
  from public.event_sponsors es
  join public.organisations o on o.id = es.organisation_id
  where es.event_id = p_event_id
    and es.active
    and o.active
    and es.sponsor_status = 'confirmed'
    and lower(o.organisation_name) <> 'other'
  order by lower(o.organisation_name), o.organisation_name;
$function$
;
CREATE OR REPLACE FUNCTION public.submit_registration_v2(p_event_id uuid, p_invitation_code text, p_submitted_on_behalf boolean, p_submitter_name text, p_submitter_email text, p_attendee_email text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_submission_id uuid;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_work_payload jsonb;
  v_saved_payload jsonb;
  v_category text;
  v_saved_category text;
  v_sponsor_name text;
  v_sponsor_other text;
  v_has_invitation boolean := nullif(trim(coalesce(p_invitation_code, '')), '') is not null;
  v_accommodation_required boolean;
begin
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception 'The registration details are invalid.';
  end if;

  v_category := nullif(trim(v_payload ->> 'category'), '');
  v_category := case v_category
    when 'Military VIP' then 'Winter Sports Ambassador'
    when 'Military Ambassador' then 'Winter Sports Ambassador'
    when 'Proton' then 'Protocol Intern'
    when 'Sponsor Representative' then 'Sponsor'
    when 'Sponsor Representative''s Guest' then 'Sponsor Guest'
    else v_category
  end;
  if v_category is null or v_category not in (
    'Sponsor','Sponsor Guest','Winter Sports Ambassador','Military Guest',
    'Committee','Committee Guest','Hill Team','Protocol','Protocol Intern'
  ) then
    raise exception 'Choose a valid attendee category.';
  end if;

  v_work_payload := v_payload || jsonb_build_object('category', v_category);

  if v_category in ('Sponsor Guest','Military Guest','Committee Guest') then
    v_work_payload := v_work_payload || jsonb_build_object('role', 'Guest');
  end if;

  if v_category in ('Winter Sports Ambassador','Committee') then
    if coalesce(v_payload ->> 'service', '') not in ('Army','Navy','RAF','Civil Service','Other') then
      raise exception 'Choose the attendee service.';
    end if;
    if v_payload ->> 'service' = 'Other'
       and nullif(trim(v_payload ->> 'service_other'), '') is null then
      raise exception 'Enter the attendee service.';
    end if;
  else
    v_work_payload := v_work_payload || jsonb_build_object('service', null, 'service_other', null);
  end if;

  if v_category = 'Hill Team' then
    if coalesce(v_payload ->> 'discipline', '') not in ('Alpine','Snowboard','Telemark','Other') then
      raise exception 'Choose the Hill Team or Race Committee discipline.';
    end if;
    if v_payload ->> 'discipline' = 'Other'
       and nullif(trim(v_payload ->> 'discipline_other'), '') is null then
      raise exception 'Enter the Hill Team or Race Committee discipline.';
    end if;
  else
    v_work_payload := v_work_payload || jsonb_build_object('discipline', null, 'discipline_other', null);
  end if;

  v_sponsor_name := nullif(trim(v_payload ->> 'sponsor_name'), '');
  v_sponsor_other := nullif(trim(v_payload ->> 'sponsor_other'), '');
  if not v_has_invitation and v_category = 'Sponsor' then
    if v_sponsor_name = 'Other' then
      if v_sponsor_other is null then raise exception 'Enter the sponsor name.'; end if;
      if length(v_sponsor_other) > 200 then raise exception 'The sponsor name is too long.'; end if;
      v_work_payload := v_work_payload || jsonb_build_object('sponsor_name', 'Other');
    elsif not exists (
      select 1
      from public.event_sponsors es
      join public.organisations o on o.id = es.organisation_id
      where es.event_id = p_event_id and es.active and o.active
        and es.sponsor_status = 'confirmed'
        and lower(o.organisation_name) = lower(v_sponsor_name)
    ) then
      raise exception 'Choose a sponsor from the current sponsor list.';
    end if;
  elsif not v_has_invitation and v_category = 'Sponsor Guest' then
    -- The public form intentionally does not ask guests to choose a sponsor.
    -- Supply the hidden catch-all only to satisfy the legacy intake routine.
    v_work_payload := v_work_payload || jsonb_build_object('sponsor_name', 'Other', 'sponsor_other', null);
  elsif not v_has_invitation then
    v_work_payload := v_work_payload || jsonb_build_object('sponsor_name', null, 'sponsor_other', null);
  end if;

  v_accommodation_required := coalesce((v_payload ->> 'accommodation_required')::boolean, false)
    or v_category in ('Protocol','Protocol Intern','Hill Team');
  if v_accommodation_required then
    if v_category in ('Sponsor','Sponsor Guest') then
      if coalesce(v_payload ->> 'hotel_preference', '') not in ('Eterlou','Chaudanne','Savoy','No preference') then
        raise exception 'Choose a valid hotel preference.';
      end if;
      if coalesce(v_payload ->> 'accommodation_from', '') not in ('2027-01-30','2027-02-03') then
        raise exception 'Sponsor arrivals are limited to Saturday 30 January or Wednesday 3 February.';
      end if;
      if coalesce(v_payload ->> 'accommodation_to', '') not in ('2027-02-03','2027-02-06') then
        raise exception 'Sponsor departures are limited to Wednesday 3 February or Saturday 6 February.';
      end if;
    else
      -- Protocol allocates the hotel for every non-sponsor category.
      v_work_payload := v_work_payload || jsonb_build_object('hotel_preference', 'No preference');
    end if;
  else
    v_work_payload := v_work_payload || jsonb_build_object('hotel_preference', null);
  end if;

  if coalesce((v_payload ->> 'lessons_required')::boolean, false) then
    if jsonb_typeof(v_payload -> 'lesson_dates') <> 'array'
       or jsonb_array_length(v_payload -> 'lesson_dates') = 0
       or exists (
         select 1 from jsonb_array_elements_text(v_payload -> 'lesson_dates') d(value)
         where d.value not in ('2027-01-31','2027-02-01','2027-02-02','2027-02-03','2027-02-04','2027-02-05')
       ) then
      raise exception 'Choose one or more valid lesson dates.';
    end if;
  end if;

  v_submission_id := public.submit_registration_v2_legacy_v31(
    p_event_id, p_invitation_code, p_submitted_on_behalf, p_submitter_name,
    p_submitter_email, p_attendee_email, v_work_payload
  );

  select raw_payload into v_saved_payload
  from public.intake_submissions
  where id = v_submission_id
  for update;

  v_saved_category := case v_saved_payload ->> 'category'
    when 'Military VIP' then 'Winter Sports Ambassador'
    when 'Military Ambassador' then 'Winter Sports Ambassador'
    when 'Proton' then 'Protocol Intern'
    else v_saved_payload ->> 'category'
  end;
  if v_saved_category not in (
    'Sponsor','Sponsor Guest','Winter Sports Ambassador','Military Guest',
    'Committee','Committee Guest','Hill Team','Protocol','Protocol Intern'
  ) then
    raise exception 'This invitation uses an attendee category that is no longer available.';
  end if;

  v_saved_payload := v_saved_payload || jsonb_build_object(
    'category', v_saved_category,
    'role', case when v_saved_category in ('Sponsor Guest','Military Guest','Committee Guest') then 'Guest' else v_saved_payload ->> 'role' end,
    'hotel_preference', case when v_saved_category in ('Sponsor','Sponsor Guest') then v_saved_payload -> 'hotel_preference' else 'null'::jsonb end,
    'service', case when v_saved_category in ('Winter Sports Ambassador','Committee') then v_saved_payload -> 'service' else 'null'::jsonb end,
    'service_other', case when v_saved_category in ('Winter Sports Ambassador','Committee') and v_saved_payload ->> 'service' = 'Other' then v_payload -> 'service_other' else 'null'::jsonb end,
    'discipline', case when v_saved_category = 'Hill Team' then v_saved_payload -> 'discipline' else 'null'::jsonb end,
    'discipline_other', case when v_saved_category = 'Hill Team' and v_saved_payload ->> 'discipline' = 'Other' then v_payload -> 'discipline_other' else 'null'::jsonb end
  );

  if not v_has_invitation and v_saved_category = 'Sponsor' and v_sponsor_name = 'Other' then
    v_saved_payload := v_saved_payload || jsonb_build_object('sponsor_name', v_sponsor_other, 'sponsor_other', null);
  elsif not v_has_invitation and v_saved_category <> 'Sponsor' then
    v_saved_payload := v_saved_payload || jsonb_build_object('sponsor_name', null, 'sponsor_other', null);
  end if;

  update public.intake_submissions
  set raw_payload = v_saved_payload, mapping_version = 'web_v4'
  where id = v_submission_id;

  return v_submission_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_arrangements(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'attendees', coalesce(jsonb_agg(jsonb_build_object(
      'attendee_id', a.id,
      'display_name', btrim(concat_ws(' ', a.title_rank, a.first_name, a.surname)),
      'category', a.category,
      'attendance_status', a.attendance_status,
      'request', jsonb_strip_nulls(jsonb_build_object(
        'hotel_preference', intake.raw_payload->>'hotel_preference',
        'accommodation_from', intake.raw_payload->>'accommodation_from',
        'accommodation_to', intake.raw_payload->>'accommodation_to',
        'share_room', intake.raw_payload->'share_room',
        'sharing_with', intake.raw_payload->>'sharing_with',
        'arrival_method', intake.raw_payload->>'arrival_method',
        'arrival_airport_station', intake.raw_payload->>'arrival_airport_station',
        'arrival_number', intake.raw_payload->>'arrival_number',
        'arrival_datetime', intake.raw_payload->>'arrival_datetime',
        'arrival_transfer', intake.raw_payload->'arrival_transfer',
        'arrival_transfer_option', intake.raw_payload->>'arrival_transfer_option',
        'departure_method', intake.raw_payload->>'departure_method',
        'departure_airport_station', intake.raw_payload->>'departure_airport_station',
        'departure_number', intake.raw_payload->>'departure_number',
        'departure_datetime', intake.raw_payload->>'departure_datetime',
        'departure_transfer', intake.raw_payload->'departure_transfer',
        'departure_transfer_option', intake.raw_payload->>'departure_transfer_option',
        'lift_pass_required', intake.raw_payload->'lift_pass_required',
        'first_ski_day', intake.raw_payload->>'first_ski_day',
        'last_ski_day', intake.raw_payload->>'last_ski_day',
        'lessons_required', intake.raw_payload->'lessons_required',
        'lesson_type', intake.raw_payload->>'lesson_type',
        'lesson_dates', intake.raw_payload->'lesson_dates',
        'equipment_hire_required', intake.raw_payload->'equipment_hire_required',
        'dinners_required', intake.raw_payload->'dinners_required'
      )),
      'accommodation', jsonb_strip_nulls(jsonb_build_object(
        'state', case
          when allocation.id is not null or stay.id is not null then 'confirmed'
          when room_request.id is not null or lower(coalesce(intake.raw_payload->>'accommodation_required','false')) in ('true','yes','1') then 'pending'
          else 'not_required' end,
        'requested_hotel', coalesce(room_request.hotel_preference, intake.raw_payload->>'hotel_preference'),
        'requested_check_in', coalesce(room_request.requested_check_in::text, intake.raw_payload->>'accommodation_from'),
        'requested_check_out', coalesce(room_request.requested_check_out::text, intake.raw_payload->>'accommodation_to'),
        'requested_share', coalesce(room_request.room_share_requested, lower(coalesce(intake.raw_payload->>'share_room','false')) in ('true','yes','1')),
        'requested_share_with', coalesce(room_request.requested_share_with, intake.raw_payload->>'sharing_with'),
        'hotel', coalesce(allocation.hotel_name_snapshot, stay_location.name),
        'room', allocation.room_reference_snapshot,
        'check_in', coalesce(allocation.check_in, stay.actual_check_in),
        'check_out', coalesce(allocation.check_out, stay.actual_check_out)
      )),
      'arrival', jsonb_strip_nulls(jsonb_build_object(
        'state', case when arrival_run.id is not null or arrival.id is not null then 'confirmed'
          when lower(coalesce(intake.raw_payload->>'arrival_transfer','false')) in ('true','yes','1') then 'pending'
          else 'not_required' end,
        'requested_method', intake.raw_payload->>'arrival_method',
        'requested_point', intake.raw_payload->>'arrival_airport_station',
        'requested_number', intake.raw_payload->>'arrival_number',
        'requested_time', intake.raw_payload->>'arrival_datetime',
        'requested_transfer', intake.raw_payload->>'arrival_transfer_option',
        'method', arrival.method_of_transport,
        'point', arrival.airport_station,
        'number', arrival.flight_travel_number,
        'travel_time', arrival.travel_datetime,
        'resort_time', arrival.resort_datetime,
        'transfer_service', arrival.transfer_service
      )),
      'departure', jsonb_strip_nulls(jsonb_build_object(
        'state', case when departure_run.id is not null or departure.id is not null then 'confirmed'
          when lower(coalesce(intake.raw_payload->>'departure_transfer','false')) in ('true','yes','1') then 'pending'
          else 'not_required' end,
        'requested_method', intake.raw_payload->>'departure_method',
        'requested_point', intake.raw_payload->>'departure_airport_station',
        'requested_number', intake.raw_payload->>'departure_number',
        'requested_time', intake.raw_payload->>'departure_datetime',
        'requested_transfer', intake.raw_payload->>'departure_transfer_option',
        'method', departure.method_of_transport,
        'point', departure.airport_station,
        'number', departure.flight_travel_number,
        'travel_time', departure.travel_datetime,
        'resort_time', departure.resort_datetime,
        'transfer_service', departure.transfer_service
      )),
      'lift_pass', jsonb_strip_nulls(jsonb_build_object(
        'state', case when lift.id is not null then 'confirmed'
          when lower(coalesce(intake.raw_payload->>'lift_pass_required','false')) in ('true','yes','1') then 'pending'
          else 'not_required' end,
        'requested', intake.raw_payload->'lift_pass_required',
        'requested_start', intake.raw_payload->>'first_ski_day',
        'requested_end', intake.raw_payload->>'last_ski_day',
        'required', lift.required,
        'pass_type', lift.pass_type,
        'start_date', lift.start_date,
        'end_date', lift.end_date,
        'carre_neige', lift.carre_neige_required
      )),
      'other_requests', jsonb_strip_nulls(jsonb_build_object(
        'lessons_required', intake.raw_payload->'lessons_required',
        'lesson_type', intake.raw_payload->>'lesson_type',
        'lesson_dates', intake.raw_payload->'lesson_dates',
        'equipment_hire_required', intake.raw_payload->'equipment_hire_required',
        'dinners_required', intake.raw_payload->'dinners_required'
      )),
      'transfers', coalesce((
        select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
          'id', tr.id,
          'direction', tr.direction,
          'name', tr.transfer_name,
          'status', tr.status,
          'departure_at', tr.departure_at,
          'pickup', coalesce(tp.pickup_override, tr.pickup_location),
          'destination', tr.destination,
          'service', tr.service_type,
          'vehicle', tr.vehicle_details,
          'driver_name', tr.driver_name,
          'driver_mobile', tr.driver_mobile,
          'lead_name', tr.lead_traveller_name,
          'lead_mobile', tr.lead_traveller_mobile,
          'attendee_notes', tr.attendee_notes
        )) order by tr.departure_at)
        from public.transfer_runs tr
        left join public.transfer_passengers tp on tp.transfer_run_id = tr.id and tp.attendee_id = a.id
        where tr.event_id = p_event_id and tr.published and tr.status <> 'cancelled'
          and (tp.attendee_id = a.id or tr.lead_traveller_attendee_id = a.id)
      ), '[]'::jsonb)
    ) order by a.surname, a.first_name), '[]'::jsonb)
  ) into v_result
  from public.attendees a
  left join lateral (
    select i.raw_payload from public.intake_submissions i
    where i.mapped_attendee_id = a.id order by i.submitted_at desc limit 1
  ) intake on true
  left join lateral (
    select r.* from public.room_allocation_requests r
    where r.attendee_id = a.id and r.source_active order by r.updated_at desc limit 1
  ) room_request on true
  left join lateral (
    select h.* from public.hotel_room_allocations h
    where h.attendee_id = a.id and h.allocation_status = 'confirmed' order by h.decided_at desc limit 1
  ) allocation on true
  left join lateral (
    select s.* from public.stay_charge_periods s
    where s.attendee_id = a.id and s.protocol_confirmed order by s.updated_at desc limit 1
  ) stay on true
  left join public.accommodation_locations stay_location on stay_location.id = stay.location_id
  left join lateral (
    select t.* from public.travel_records t
    where t.attendee_id = a.id and t.direction = 'arrival' and t.protocol_confirmed
    order by t.updated_at desc limit 1
  ) arrival on true
  left join lateral (
    select t.* from public.travel_records t
    where t.attendee_id = a.id and t.direction = 'departure' and t.protocol_confirmed
    order by t.updated_at desc limit 1
  ) departure on true
  left join lateral (
    select l.* from public.lift_passes l
    where l.attendee_id = a.id and l.protocol_confirmed order by l.updated_at desc limit 1
  ) lift on true
  left join lateral (
    select tr.id from public.transfer_runs tr
    left join public.transfer_passengers tp on tp.transfer_run_id = tr.id
    where tr.event_id = p_event_id and tr.direction = 'arrival' and tr.published and tr.status <> 'cancelled'
      and (tp.attendee_id = a.id or tr.lead_traveller_attendee_id = a.id)
    limit 1
  ) arrival_run on true
  left join lateral (
    select tr.id from public.transfer_runs tr
    left join public.transfer_passengers tp on tp.transfer_run_id = tr.id
    where tr.event_id = p_event_id and tr.direction = 'departure' and tr.published and tr.status <> 'cancelled'
      and (tp.attendee_id = a.id or tr.lead_traveller_attendee_id = a.id)
    limit 1
  ) departure_run on true
  where a.event_id = p_event_id
    and a.attendance_status <> 'cancelled'
    and private.is_own_attendee(a.id);

  return v_result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_protocol_attendee_service_overview(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required';
  end if;
  perform private.require_actor_role((select auth.uid()), array['admin','protocol','operations','read_only']);

  with enriched as (
    select
      a.id,
      a.title_rank,
      a.first_name,
      a.surname,
      a.email,
      a.category,
      a.attendance_status,
      a.record_source,
      coalesce(o.organisation_name, a.display_company) as organisation_name,
      intake.raw_payload as request,
      room_request.id as room_request_id,
      room_request.hotel_preference,
      room_request.requested_check_in,
      room_request.requested_check_out,
      room_request.allocation_status as room_request_status,
      room_allocation.id as room_allocation_id,
      room_allocation.hotel_name_snapshot,
      room_allocation.room_reference_snapshot,
      room_allocation.check_in as room_check_in,
      room_allocation.check_out as room_check_out,
      stay.id as stay_id,
      stay.protocol_confirmed as stay_confirmed,
      stay.actual_check_in,
      stay.actual_check_out,
      stay_location.name as stay_location_name,
      arrival.id as arrival_id,
      arrival.transfer_requested as arrival_transfer_requested,
      arrival.transfer_service as arrival_transfer_service,
      arrival.travel_datetime as arrival_time,
      arrival.protocol_confirmed as arrival_confirmed,
      departure.id as departure_id,
      departure.transfer_requested as departure_transfer_requested,
      departure.transfer_service as departure_transfer_service,
      departure.travel_datetime as departure_time,
      departure.protocol_confirmed as departure_confirmed,
      lift.id as lift_id,
      lift.required as lift_required,
      lift.start_date as lift_start,
      lift.end_date as lift_end,
      lift.protocol_confirmed as lift_confirmed,
      arrival_run.id as arrival_run_id,
      arrival_run.transfer_name as arrival_run_name,
      arrival_run.departure_at as arrival_run_time,
      arrival_run.status as arrival_run_status,
      departure_run.id as departure_run_id,
      departure_run.transfer_name as departure_run_name,
      departure_run.departure_at as departure_run_time,
      departure_run.status as departure_run_status
    from public.attendees a
    left join public.organisations o on o.id = a.organisation_id
    left join lateral (
      select i.raw_payload
      from public.intake_submissions i
      where i.mapped_attendee_id = a.id
      order by i.submitted_at desc
      limit 1
    ) intake on true
    left join lateral (
      select r.*
      from public.room_allocation_requests r
      where r.attendee_id = a.id and r.source_active
      order by r.updated_at desc
      limit 1
    ) room_request on true
    left join lateral (
      select h.*
      from public.hotel_room_allocations h
      where h.attendee_id = a.id and h.allocation_status = 'confirmed'
      order by h.decided_at desc
      limit 1
    ) room_allocation on true
    left join lateral (
      select s.*
      from public.stay_charge_periods s
      where s.attendee_id = a.id
      order by s.protocol_confirmed desc, s.updated_at desc
      limit 1
    ) stay on true
    left join public.accommodation_locations stay_location on stay_location.id = stay.location_id
    left join lateral (
      select t.* from public.travel_records t
      where t.attendee_id = a.id and t.direction = 'arrival'
      order by t.updated_at desc limit 1
    ) arrival on true
    left join lateral (
      select t.* from public.travel_records t
      where t.attendee_id = a.id and t.direction = 'departure'
      order by t.updated_at desc limit 1
    ) departure on true
    left join lateral (
      select l.* from public.lift_passes l
      where l.attendee_id = a.id
      order by l.updated_at desc limit 1
    ) lift on true
    left join lateral (
      select tr.*
      from public.transfer_runs tr
      left join public.transfer_passengers tp on tp.transfer_run_id = tr.id
      where tr.event_id = a.event_id and tr.direction = 'arrival' and tr.status <> 'cancelled'
        and (tr.lead_traveller_attendee_id = a.id or tp.attendee_id = a.id)
      order by (tr.status in ('confirmed','departed','completed')) desc, tr.departure_at
      limit 1
    ) arrival_run on true
    left join lateral (
      select tr.*
      from public.transfer_runs tr
      left join public.transfer_passengers tp on tp.transfer_run_id = tr.id
      where tr.event_id = a.event_id and tr.direction = 'departure' and tr.status <> 'cancelled'
        and (tr.lead_traveller_attendee_id = a.id or tp.attendee_id = a.id)
      order by (tr.status in ('confirmed','departed','completed')) desc, tr.departure_at
      limit 1
    ) departure_run on true
    where a.event_id = p_event_id
      and a.attendance_status <> 'cancelled'
  ), statused as (
    select e.*,
      case
        when e.room_allocation_id is not null or coalesce(e.stay_confirmed, false) then 'confirmed'
        when e.room_request_id is not null or e.stay_id is not null
          or lower(coalesce(e.request->>'accommodation_required','false')) in ('true','yes','1') then 'pending'
        else 'not_required'
      end as accommodation_state,
      case
        when e.arrival_run_status in ('confirmed','departed','completed') or coalesce(e.arrival_confirmed, false) then 'confirmed'
        when e.arrival_id is not null or e.arrival_run_id is not null
          or lower(coalesce(e.request->>'arrival_transfer','false')) in ('true','yes','1') then 'pending'
        else 'not_required'
      end as arrival_state,
      case
        when e.departure_run_status in ('confirmed','departed','completed') or coalesce(e.departure_confirmed, false) then 'confirmed'
        when e.departure_id is not null or e.departure_run_id is not null
          or lower(coalesce(e.request->>'departure_transfer','false')) in ('true','yes','1') then 'pending'
        else 'not_required'
      end as departure_state,
      case
        when coalesce(e.lift_confirmed, false) then 'confirmed'
        when e.lift_id is not null or lower(coalesce(e.request->>'lift_pass_required','false')) in ('true','yes','1') then 'pending'
        else 'not_required'
      end as lift_state
    from enriched e
  ), rows as (
    select s.*,
      ((s.accommodation_state = 'pending')::int + (s.arrival_state = 'pending')::int +
       (s.departure_state = 'pending')::int + (s.lift_state = 'pending')::int) as pending_count,
      ((s.accommodation_state = 'confirmed')::int + (s.arrival_state = 'confirmed')::int +
       (s.departure_state = 'confirmed')::int + (s.lift_state = 'confirmed')::int) as confirmed_count
    from statused s
  )
  select jsonb_build_object(
    'generated_at', now(),
    'rows', coalesce(jsonb_agg(jsonb_build_object(
      'attendee_id', r.id,
      'display_name', btrim(concat_ws(' ', r.title_rank, r.first_name, r.surname)),
      'email', r.email,
      'category', r.category,
      'organisation_name', r.organisation_name,
      'attendance_status', r.attendance_status,
      'record_source', r.record_source,
      'accommodation_state', r.accommodation_state,
      'accommodation_summary', coalesce(
        nullif(concat_ws(' · ', r.hotel_name_snapshot, r.room_reference_snapshot,
          case when r.room_check_in is not null then r.room_check_in::text || ' to ' || r.room_check_out::text end), ''),
        nullif(concat_ws(' · ', r.stay_location_name,
          case when r.actual_check_in is not null then r.actual_check_in::text || ' to ' || r.actual_check_out::text end), ''),
        nullif(concat_ws(' · ', r.hotel_preference,
          case when r.requested_check_in is not null then r.requested_check_in::text || ' to ' || r.requested_check_out::text end), ''),
        r.request->>'hotel_preference', 'No request recorded'),
      'arrival_state', r.arrival_state,
      'arrival_summary', coalesce(
        nullif(concat_ws(' · ', r.arrival_run_name, r.arrival_run_time::text), ''),
        nullif(concat_ws(' · ', r.arrival_transfer_service, r.arrival_time::text), ''),
        r.request->>'arrival_transfer_option', r.request->>'arrival_method', 'No request recorded'),
      'departure_state', r.departure_state,
      'departure_summary', coalesce(
        nullif(concat_ws(' · ', r.departure_run_name, r.departure_run_time::text), ''),
        nullif(concat_ws(' · ', r.departure_transfer_service, r.departure_time::text), ''),
        r.request->>'departure_transfer_option', r.request->>'departure_method', 'No request recorded'),
      'lift_state', r.lift_state,
      'lift_summary', case
        when r.lift_confirmed and not coalesce(r.lift_required, false) then 'Confirmed: not required'
        when r.lift_start is not null then concat_ws(' to ', r.lift_start::text, r.lift_end::text)
        when lower(coalesce(r.request->>'lift_pass_required','false')) in ('true','yes','1') then
          concat_ws(' to ', r.request->>'first_ski_day', r.request->>'last_ski_day')
        else 'No request recorded' end,
      'other_requests', to_jsonb(array_remove(array[
        case when lower(coalesce(r.request->>'lessons_required','false')) in ('true','yes','1') then 'Lessons' end,
        case when lower(coalesce(r.request->>'equipment_hire_required','false')) in ('true','yes','1') then 'Equipment hire' end,
        case when lower(coalesce(r.request->>'dinners_required','false')) in ('true','yes','1') then 'Dinners' end,
        case when lower(coalesce(r.request->>'share_room','false')) in ('true','yes','1') then 'Room share' end
      ]::text[], null)),
      'pending_count', r.pending_count,
      'confirmed_count', r.confirmed_count,
      'overall_state', case when r.pending_count > 0 then 'pending'
        when r.confirmed_count > 0 then 'confirmed' else 'no_requests' end
    ) order by r.surname, r.first_name), '[]'::jsonb)
  ) into v_result
  from rows r;

  return v_result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.delete_protocol_service_item(p_item_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_item public.attendee_service_items%rowtype;
  v_event uuid;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor,array['admin','protocol','operations']);
  select * into v_item from public.attendee_service_items where id=p_item_id for update;
  if v_item.id is null then raise exception 'Service item not found'; end if;
  select event_id into v_event from public.attendees where id=v_item.attendee_id;
  if v_item.usage_extra_id is not null and exists (
    select 1 from public.invoice_lines l join public.invoices i on i.id=l.invoice_id
    where l.source_id=v_item.usage_extra_id and i.status in ('approved','issued','paid')
  ) then raise exception 'This service is included in a finalised invoice and cannot be deleted'; end if;
  if v_item.usage_extra_id is not null then delete from public.usage_extras where id=v_item.usage_extra_id; end if;
  delete from public.attendee_service_items where id=v_item.id;
  update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=v_item.attendee_id;
  if v_item.usage_extra_id is not null then
    update public.invoices i set status='awaiting_billing_update',updated_at=now()
    from public.attendees a
    where a.id=v_item.attendee_id and i.event_id=v_event
      and i.status in ('draft','awaiting_billing_update','ready_for_review')
      and ((i.invoice_type='individual' and i.attendee_id=v_item.attendee_id)
        or (i.invoice_type='consolidated_company' and a.consolidated_invoice_included
          and i.billing_account_organisation_id=a.billing_account_organisation_id));
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.save_protocol_service_item(p_attendee_id uuid, p_item_id uuid, p_service_type text, p_service_date date, p_title text, p_status text, p_quantity numeric, p_chargeable boolean, p_rate_code text, p_attendee_details text, p_protocol_notes text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_event uuid;
  v_item public.attendee_service_items%rowtype;
  v_rate public.rate_card%rowtype;
  v_usage_id uuid;
  v_financial_change boolean := false;
begin
  if v_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
  perform private.require_actor_role(v_actor, array['admin','protocol','operations']);

  if p_service_type not in ('lesson','equipment_hire','dinner','champagne','other') then
    raise exception 'Unsupported service type';
  end if;
  if p_status not in ('pending','confirmed','cancelled') then
    raise exception 'Unsupported service status';
  end if;
  if nullif(btrim(coalesce(p_title,'')), '') is null then raise exception 'Service title is required'; end if;
  if coalesce(p_quantity,0) <= 0 then raise exception 'Quantity must be greater than zero'; end if;

  select a.event_id into v_event from public.attendees a where a.id=p_attendee_id;
  if v_event is null then raise exception 'Attendee not found'; end if;

  if p_item_id is not null then
    select * into v_item from public.attendee_service_items
    where id=p_item_id and attendee_id=p_attendee_id for update;
    if v_item.id is null then raise exception 'Service item not found'; end if;
  end if;

  if coalesce(p_chargeable,false) then
    if p_status <> 'confirmed' then raise exception 'A chargeable service must be confirmed'; end if;
    if nullif(btrim(coalesce(p_rate_code,'')), '') is null then raise exception 'Choose an approved rate for a chargeable service'; end if;

    select * into v_rate from public.rate_card r
    where r.event_id=v_event and r.rate_code=p_rate_code and r.active and r.status='approved'
    order by r.updated_at desc limit 1;
    if v_rate.id is null then raise exception 'The selected approved rate is not available'; end if;
    if p_service_type='lesson' and v_rate.charge_category not in ('lesson_group','lesson_private','lesson_telemark') then
      raise exception 'Choose a lesson rate';
    elsif p_service_type='dinner' and v_rate.charge_category <> 'dinner' then
      raise exception 'Choose a dinner rate';
    elsif p_service_type='champagne' and v_rate.charge_category <> 'champagne' then
      raise exception 'Choose the champagne rate';
    elsif p_service_type='equipment_hire' and v_rate.charge_category <> 'equipment_hire' then
      raise exception 'No approved equipment-hire rate is currently available';
    elsif p_service_type='other' then
      raise exception 'Other operational items cannot create a charge; Finance can add an approved adjustment if needed';
    end if;
  end if;

  v_financial_change := coalesce(p_chargeable,false) or v_item.usage_extra_id is not null;
  if v_financial_change and exists (
    select 1 from public.invoices i
    left join public.attendees a on a.id=p_attendee_id
    where i.event_id=v_event and i.status in ('approved','issued','paid')
      and ((i.invoice_type='individual' and i.attendee_id=p_attendee_id)
        or (i.invoice_type='consolidated_company' and a.consolidated_invoice_included
          and i.billing_account_organisation_id=a.billing_account_organisation_id))
  ) then
    raise exception 'This charge cannot be changed after the attendee invoice has been finalised; Finance must record an adjustment';
  end if;

  if v_item.id is null then
    insert into public.attendee_service_items(
      attendee_id,service_type,service_date,title,status,quantity,chargeable,rate_code,
      attendee_details,protocol_notes,recorded_by,confirmed_by,confirmed_at
    ) values (
      p_attendee_id,p_service_type,p_service_date,btrim(p_title),p_status,p_quantity,
      coalesce(p_chargeable,false),case when p_chargeable then p_rate_code else null end,
      nullif(btrim(coalesce(p_attendee_details,'')),''),nullif(btrim(coalesce(p_protocol_notes,'')),''),v_actor,
      case when p_status='confirmed' then v_actor else null end,
      case when p_status='confirmed' then now() else null end
    ) returning * into v_item;
  else
    update public.attendee_service_items set
      service_type=p_service_type, service_date=p_service_date, title=btrim(p_title), status=p_status,
      quantity=p_quantity, chargeable=coalesce(p_chargeable,false),
      rate_code=case when p_chargeable then p_rate_code else null end,
      attendee_details=nullif(btrim(coalesce(p_attendee_details,'')),''),
      protocol_notes=nullif(btrim(coalesce(p_protocol_notes,'')),''), recorded_by=v_actor,
      confirmed_by=case when p_status='confirmed' then coalesce(confirmed_by,v_actor) else null end,
      confirmed_at=case when p_status='confirmed' then coalesce(confirmed_at,now()) else null end
    where id=v_item.id returning * into v_item;
  end if;

  if v_item.status='confirmed' and v_item.chargeable then
    if v_item.usage_extra_id is null then
      insert into public.usage_extras(attendee_id,usage_date,category,quantity,rate_code,chargeable,notes,recorded_by)
      values(v_item.attendee_id,v_item.service_date,v_rate.charge_category,v_item.quantity,v_rate.rate_code,true,v_item.attendee_details,v_actor)
      returning id into v_usage_id;
      update public.attendee_service_items set usage_extra_id=v_usage_id where id=v_item.id;
    else
      update public.usage_extras set usage_date=v_item.service_date,category=v_rate.charge_category,
        quantity=v_item.quantity,rate_code=v_rate.rate_code,chargeable=true,notes=v_item.attendee_details,recorded_by=v_actor
      where id=v_item.usage_extra_id;
    end if;
  elsif v_item.usage_extra_id is not null then
    delete from public.usage_extras where id=v_item.usage_extra_id;
    update public.attendee_service_items set usage_extra_id=null where id=v_item.id;
  end if;

  update public.attendees set data_checked=false,checked_by=null,checked_at=null where id=p_attendee_id;
  if v_financial_change then
    update public.invoices i set status='awaiting_billing_update',updated_at=now()
    from public.attendees a
    where a.id=p_attendee_id and i.event_id=v_event
      and i.status in ('draft','awaiting_billing_update','ready_for_review')
      and ((i.invoice_type='individual' and i.attendee_id=p_attendee_id)
        or (i.invoice_type='consolidated_company' and a.consolidated_invoice_included
          and i.billing_account_organisation_id=a.billing_account_organisation_id));
  end if;
  return v_item.id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_protocol_additional_service_overview(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  perform private.require_actor_role(auth.uid(),array['admin','protocol','operations','read_only']);

  with source as (
    select a.id,
      intake.raw_payload as request,
      stay.id as stay_id, stay.protocol_confirmed, stay.sharing_with_attendee_id,
      share.first_name as share_first_name, share.surname as share_surname,
      rc.includes_dinner,
      allocation.occupancy_count,
      coalesce(items.items,'[]'::jsonb) as items
    from public.attendees a
    left join lateral (select i.raw_payload from public.intake_submissions i where i.mapped_attendee_id=a.id order by i.submitted_at desc limit 1) intake on true
    left join lateral (select s.* from public.stay_charge_periods s where s.attendee_id=a.id order by s.protocol_confirmed desc,s.updated_at desc limit 1) stay on true
    left join public.attendees share on share.id=stay.sharing_with_attendee_id
    left join public.rate_card rc on rc.event_id=a.event_id and rc.rate_code=stay.rate_code and rc.active
    left join lateral (select h.* from public.hotel_room_allocations h where h.attendee_id=a.id and h.allocation_status='confirmed' order by h.decided_at desc limit 1) allocation on true
    left join lateral (
      select jsonb_agg(jsonb_build_object('id',x.id,'type',x.service_type,'title',x.title,'status',x.status,'date',x.service_date,'details',x.attendee_details) order by x.service_date nulls last,x.created_at) items
      from public.attendee_service_items x where x.attendee_id=a.id
    ) items on true
    where a.event_id=p_event_id and a.attendance_status<>'cancelled'
  ), statused as (
    select s.*,
      case when s.items @? '$[*] ? (@.type == "lesson" && @.status == "confirmed")' then 'confirmed'
        when s.items @? '$[*] ? (@.type == "lesson" && @.status == "pending")'
          or lower(coalesce(s.request->>'lessons_required','false')) in ('true','yes','1') then 'pending' else 'not_required' end lesson_state,
      case when s.items @? '$[*] ? (@.type == "equipment_hire" && @.status == "confirmed")' then 'confirmed'
        when s.items @? '$[*] ? (@.type == "equipment_hire" && @.status == "pending")'
          or lower(coalesce(s.request->>'equipment_hire_required','false')) in ('true','yes','1') then 'pending' else 'not_required' end equipment_state,
      case when s.items @? '$[*] ? (@.type == "dinner" && @.status == "confirmed")' or coalesce(s.protocol_confirmed,false) then 'confirmed'
        when s.items @? '$[*] ? (@.type == "dinner" && @.status == "pending")'
          or nullif(s.request->>'dinners_required','') is not null then 'pending' else 'not_required' end dinner_state,
      case when lower(coalesce(s.request->>'share_room','false')) not in ('true','yes','1') then 'not_required'
        when s.sharing_with_attendee_id is not null or coalesce(s.occupancy_count,1)>1 then 'confirmed' else 'pending' end room_share_state,
      case when s.items @? '$[*] ? ((@.type == "champagne" || @.type == "other") && @.status == "pending")' then 'pending'
        when s.items @? '$[*] ? ((@.type == "champagne" || @.type == "other") && @.status == "confirmed")' then 'confirmed'
        else 'not_required' end additional_state
    from source s
  )
  select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object(
    'attendee_id',id,
    'lesson_state',lesson_state,
    'lesson_summary',coalesce((select string_agg(coalesce(x->>'title',x->>'details'),' · ') from jsonb_array_elements(items) x where x->>'type'='lesson' and x->>'status'<>'cancelled'),request->>'lesson_type','No request recorded'),
    'equipment_state',equipment_state,
    'equipment_summary',coalesce((select string_agg(coalesce(x->>'details',x->>'title'),' · ') from jsonb_array_elements(items) x where x->>'type'='equipment_hire' and x->>'status'<>'cancelled'),case when equipment_state='pending' then 'Equipment hire requested' end,'No request recorded'),
    'dinner_state',dinner_state,
    'dinner_summary',coalesce((select string_agg(coalesce(x->>'details',x->>'title'),' · ') from jsonb_array_elements(items) x where x->>'type'='dinner' and x->>'status'<>'cancelled'),case when protocol_confirmed then case when includes_dinner then 'Dinner included in accommodation' else 'B&B / no included dinner' end end,request->>'dinners_required','No request recorded'),
    'room_share_state',room_share_state,
    'room_share_summary',case when sharing_with_attendee_id is not null then concat_ws(' ','Sharing with',share_first_name,share_surname) when coalesce(occupancy_count,1)>1 then 'Shared room confirmed' else coalesce(request->>'sharing_with','No request recorded') end,
    'additional_state',additional_state,
    'additional_summary',coalesce((select string_agg(coalesce(x->>'title',x->>'details'),' · ') from jsonb_array_elements(items) x where x->>'type' in ('champagne','other') and x->>'status'<>'cancelled'),'No additional items'),
    'extra_pending_count',((lesson_state='pending')::int+(equipment_state='pending')::int+(dinner_state='pending')::int+(room_share_state='pending')::int+(additional_state='pending')::int),
    'extra_confirmed_count',((lesson_state='confirmed')::int+(equipment_state='confirmed')::int+(dinner_state='confirmed')::int+(room_share_state='confirmed')::int+(additional_state='confirmed')::int)
  ) order by id),'[]'::jsonb)) into v_result from statused;
  return v_result;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.get_my_additional_services(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select jsonb_build_object('rows',coalesce(jsonb_agg(jsonb_build_object(
    'attendee_id',a.id,
    'items',coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'service_type',x.service_type,'service_date',x.service_date,'title',x.title,'status',x.status,
      'quantity',x.quantity,'details',x.attendee_details
    )) order by x.service_date nulls last,x.created_at) from public.attendee_service_items x where x.attendee_id=a.id),'[]'::jsonb),
    'room_share',jsonb_strip_nulls(jsonb_build_object(
      'state',case when lower(coalesce(intake.raw_payload->>'share_room','false')) not in ('true','yes','1') then 'not_required'
        when stay.sharing_with_attendee_id is not null or coalesce(allocation.occupancy_count,1)>1 then 'confirmed' else 'pending' end,
      'requested_with',intake.raw_payload->>'sharing_with',
      'confirmed_with',nullif(concat_ws(' ',share.first_name,share.surname),''),
      'setup',case when coalesce(allocation.occupancy_count,1)>1 then 'Shared room confirmed' end
    )),
    'dinner_arrangement',jsonb_strip_nulls(jsonb_build_object(
      'state',case when exists(select 1 from public.attendee_service_items x where x.attendee_id=a.id and x.service_type='dinner' and x.status='confirmed') or coalesce(stay.protocol_confirmed,false) then 'confirmed'
        when nullif(intake.raw_payload->>'dinners_required','') is not null then 'pending' else 'not_required' end,
      'requested',intake.raw_payload->>'dinners_required',
      'confirmed',case when stay.protocol_confirmed then case when rc.includes_dinner then 'Dinner included in accommodation' else 'B&B / no included dinner' end end
    ))
  ) order by a.surname,a.first_name),'[]'::jsonb)) into v_result
  from public.attendees a
  left join lateral (select i.raw_payload from public.intake_submissions i where i.mapped_attendee_id=a.id order by i.submitted_at desc limit 1) intake on true
  left join lateral (select s.* from public.stay_charge_periods s where s.attendee_id=a.id and s.protocol_confirmed order by s.updated_at desc limit 1) stay on true
  left join public.attendees share on share.id=stay.sharing_with_attendee_id
  left join public.rate_card rc on rc.event_id=a.event_id and rc.rate_code=stay.rate_code and rc.active
  left join lateral (select h.* from public.hotel_room_allocations h where h.attendee_id=a.id and h.allocation_status='confirmed' order by h.decided_at desc limit 1) allocation on true
  where a.event_id=p_event_id and a.attendance_status<>'cancelled' and private.is_own_attendee(a.id);
  return v_result;
end;
$function$
;
create view public.v_attendee_billing_summary as  SELECT id AS attendee_id,
    event_id,
    first_name,
    surname,
    category,
    display_company,
    COALESCE(( SELECT sum(s.accommodation_charge) AS sum
           FROM stay_charge_periods s
          WHERE (s.attendee_id = a.id)), (0)::numeric) AS accommodation_total,
    COALESCE(( SELECT sum(l.total_charge) AS sum
           FROM lift_passes l
          WHERE (l.attendee_id = a.id)), (0)::numeric) AS lift_pass_total,
    COALESCE(( SELECT sum(u.total_charge) AS sum
           FROM usage_extras u
          WHERE (u.attendee_id = a.id)), (0)::numeric) AS usage_total,
    ((COALESCE(( SELECT sum(s.accommodation_charge) AS sum
           FROM stay_charge_periods s
          WHERE (s.attendee_id = a.id)), (0)::numeric) + COALESCE(( SELECT sum(l.total_charge) AS sum
           FROM lift_passes l
          WHERE (l.attendee_id = a.id)), (0)::numeric)) + COALESCE(( SELECT sum(u.total_charge) AS sum
           FROM usage_extras u
          WHERE (u.attendee_id = a.id)), (0)::numeric)) AS subtotal_before_adjustments,
    exception_flag,
    data_checked
   FROM attendees a;
create view public.v_protocol_booking_queue as  SELECT br.id AS booking_request_id,
    br.event_id,
    br.status,
    br.submitted_at,
    br.first_name,
    br.surname,
    br.email,
    br.category,
    br.accommodation_required,
    br.accommodation_from,
    br.accommodation_to,
    br.hotel_preference,
    br.arrival_method,
    br.arrival_datetime,
    br.arrival_transfer_requested,
    br.departure_method,
    br.departure_datetime,
    br.departure_transfer_requested,
    br.lift_pass_required,
    br.first_ski_day,
    br.last_ski_day,
    br.lessons_required,
    br.lesson_type,
    o.organisation_name,
    i.invitation_status,
    br.attendee_id
   FROM ((booking_requests br
     LEFT JOIN invitations i ON ((i.id = br.invitation_id)))
     LEFT JOIN organisations o ON ((o.id = i.organisation_id)));
create view public.v_usage_double_charge_flags as  SELECT u.id AS usage_extra_id,
    u.attendee_id,
    u.usage_date,
    u.category,
    u.rate_code,
    u.total_charge,
    s.id AS stay_id,
    s.rate_code AS stay_rate_code,
    rc.board_basis,
    rc.includes_dinner,
    u.approved_exception,
    u.exception_reason,
        CASE
            WHEN ((lower(u.category) = 'dinner'::text) AND (u.usage_date IS NOT NULL) AND rc.includes_dinner AND COALESCE(s.protocol_confirmed, false) AND (u.usage_date >= COALESCE(s.billing_from, s.actual_check_in)) AND (u.usage_date < COALESCE(s.billing_to, s.actual_check_out))) THEN true
            ELSE false
        END AS duplicate_dinner_risk
   FROM (((usage_extras u
     JOIN stay_charge_periods s ON ((s.attendee_id = u.attendee_id)))
     JOIN attendees a ON ((a.id = u.attendee_id)))
     JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = s.rate_code) AND rc.active)))
  WHERE (lower(u.category) = 'dinner'::text);
create view public.v_sponsor_room_allocation as  WITH sponsor_attendees AS (
         SELECT DISTINCT es_1.id AS event_sponsor_id,
            a.id AS attendee_id
           FROM ((event_sponsors es_1
             JOIN attendees a ON (((a.event_id = es_1.event_id) AND (a.attendance_status <> ALL (ARRAY['cancelled'::text, 'declined'::text])))))
             LEFT JOIN invitations attendee_invitation ON ((attendee_invitation.id = a.invitation_id)))
          WHERE ((a.organisation_id = es_1.organisation_id) OR (a.billing_account_organisation_id = es_1.organisation_id) OR (attendee_invitation.organisation_id = es_1.organisation_id))
        ), sponsor_stay_nights AS (
         SELECT sa.event_sponsor_id,
            stay.id AS stay_id,
            stay.attendee_id,
            stay.sharing_with_attendee_id,
            (night.value)::date AS stay_night
           FROM ((sponsor_attendees sa
             JOIN stay_charge_periods stay ON ((stay.attendee_id = sa.attendee_id)))
             CROSS JOIN LATERAL generate_series((stay.actual_check_in)::timestamp with time zone, ((stay.actual_check_out - 1))::timestamp with time zone, '1 day'::interval) night(value))
          WHERE (stay.protocol_confirmed AND (stay.location_id IS NOT NULL) AND (stay.room_type_id IS NOT NULL) AND (stay.actual_check_in IS NOT NULL) AND (stay.actual_check_out > stay.actual_check_in))
        ), room_nights AS (
         SELECT sponsor_night.event_sponsor_id,
            sponsor_night.stay_night,
                CASE
                    WHEN (sponsor_night.sharing_with_attendee_id IS NOT NULL) THEN LEAST(sponsor_night.attendee_id, sponsor_night.sharing_with_attendee_id)
                    ELSE COALESCE(( SELECT LEAST(sponsor_night.attendee_id, partner.attendee_id) AS "least"
                       FROM stay_charge_periods partner
                      WHERE ((partner.sharing_with_attendee_id = sponsor_night.attendee_id) AND partner.protocol_confirmed AND (partner.location_id IS NOT NULL) AND (partner.room_type_id IS NOT NULL) AND (sponsor_night.stay_night >= partner.actual_check_in) AND (sponsor_night.stay_night < partner.actual_check_out))
                      ORDER BY partner.attendee_id
                     LIMIT 1), sponsor_night.attendee_id)
                END AS room_group_id
           FROM sponsor_stay_nights sponsor_night
        ), nightly_room_use AS (
         SELECT room_nights.event_sponsor_id,
            room_nights.stay_night,
            (count(DISTINCT room_nights.room_group_id))::integer AS occupied_rooms
           FROM room_nights
          GROUP BY room_nights.event_sponsor_id, room_nights.stay_night
        ), peak_room_use AS (
         SELECT nightly_room_use.event_sponsor_id,
            max(nightly_room_use.occupied_rooms) AS occupied_rooms
           FROM nightly_room_use
          GROUP BY nightly_room_use.event_sponsor_id
        ), invitation_totals AS (
         SELECT es_1.id AS event_sponsor_id,
            (count(i.id) FILTER (WHERE (COALESCE(i.counts_against_room_allocation, true) AND (i.invitation_status <> ALL (ARRAY['cancelled'::text, 'declined'::text])))))::integer AS allocated_invites,
            (count(i.id) FILTER (WHERE (COALESCE(i.counts_against_room_allocation, true) AND (i.invitation_status = 'responded'::text))))::integer AS responded_invites
           FROM (event_sponsors es_1
             LEFT JOIN invitations i ON (((i.event_id = es_1.event_id) AND (i.organisation_id = es_1.organisation_id))))
          GROUP BY es_1.id
        ), attendee_totals AS (
         SELECT sponsor_attendees.event_sponsor_id,
            (count(DISTINCT sponsor_attendees.attendee_id))::integer AS accepted_attendees
           FROM sponsor_attendees
          GROUP BY sponsor_attendees.event_sponsor_id
        )
 SELECT es.id AS event_sponsor_id,
    es.event_id,
    es.organisation_id,
    o.organisation_name,
    es.room_allocation,
    COALESCE(invitation_totals.allocated_invites, 0) AS allocated_invites,
    COALESCE(invitation_totals.responded_invites, 0) AS responded_invites,
    COALESCE(attendee_totals.accepted_attendees, 0) AS accepted_attendees,
    GREATEST((COALESCE(es.room_allocation, 0) - COALESCE(peak_room_use.occupied_rooms, 0)), 0) AS remaining_rooms,
    (COALESCE(peak_room_use.occupied_rooms, 0) > COALESCE(es.room_allocation, 0)) AS over_allocation,
    COALESCE(peak_room_use.occupied_rooms, 0) AS occupied_rooms
   FROM ((((event_sponsors es
     JOIN organisations o ON ((o.id = es.organisation_id)))
     LEFT JOIN invitation_totals ON ((invitation_totals.event_sponsor_id = es.id)))
     LEFT JOIN attendee_totals ON ((attendee_totals.event_sponsor_id = es.id)))
     LEFT JOIN peak_room_use ON ((peak_room_use.event_sponsor_id = es.id)));
create view public.v_finance_charge_estimates as  WITH stay_totals AS (
         SELECT s_1.attendee_id,
            COALESCE(sum(s_1.accommodation_charge), (0)::numeric) AS net_total,
            COALESCE(sum(round(((s_1.accommodation_charge * COALESCE(rc.vat_rate, (0)::numeric)) / (100)::numeric), 2)), (0)::numeric) AS vat_total
           FROM ((stay_charge_periods s_1
             JOIN attendees a_1 ON ((a_1.id = s_1.attendee_id)))
             LEFT JOIN rate_card rc ON (((rc.event_id = a_1.event_id) AND (rc.rate_code = s_1.rate_code) AND rc.active)))
          GROUP BY s_1.attendee_id
        ), lift_totals AS (
         SELECT l_1.attendee_id,
            COALESCE(sum(l_1.total_charge), (0)::numeric) AS net_total,
            COALESCE(sum(round(((l_1.total_charge * COALESCE(rc.vat_rate, (0)::numeric)) / (100)::numeric), 2)), (0)::numeric) AS vat_total
           FROM ((lift_passes l_1
             JOIN attendees a_1 ON ((a_1.id = l_1.attendee_id)))
             LEFT JOIN rate_card rc ON (((rc.event_id = a_1.event_id) AND (rc.rate_code = l_1.rate_code) AND rc.active)))
          WHERE (l_1.required AND l_1.chargeable)
          GROUP BY l_1.attendee_id
        ), usage_totals AS (
         SELECT u_1.attendee_id,
            COALESCE(sum(u_1.total_charge), (0)::numeric) AS net_total,
            COALESCE(sum(round(((u_1.total_charge * COALESCE(rc.vat_rate, (0)::numeric)) / (100)::numeric), 2)), (0)::numeric) AS vat_total
           FROM ((usage_extras u_1
             JOIN attendees a_1 ON ((a_1.id = u_1.attendee_id)))
             LEFT JOIN rate_card rc ON (((rc.event_id = a_1.event_id) AND (rc.rate_code = u_1.rate_code) AND rc.active)))
          WHERE (u_1.chargeable AND (NOT usage_charge_suppressed(u_1.id)))
          GROUP BY u_1.attendee_id
        ), explicit_vat_totals AS (
         SELECT u_1.attendee_id,
            COALESCE(sum(round((u_1.quantity * vat_rc.unit_price), 2)), (0)::numeric) AS vat_total
           FROM (((usage_extras u_1
             JOIN attendees a_1 ON ((a_1.id = u_1.attendee_id)))
             JOIN rate_card base_rc ON (((base_rc.event_id = a_1.event_id) AND (base_rc.rate_code = u_1.rate_code) AND base_rc.active AND (base_rc.paired_rate_code IS NOT NULL))))
             JOIN rate_card vat_rc ON (((vat_rc.event_id = a_1.event_id) AND (vat_rc.rate_code = base_rc.paired_rate_code) AND vat_rc.active AND (vat_rc.tax_treatment = 'explicit_vat_amount'::text))))
          WHERE (u_1.chargeable AND (NOT usage_charge_suppressed(u_1.id)))
          GROUP BY u_1.attendee_id
        )
 SELECT a.id AS attendee_id,
    a.event_id,
    COALESCE(s.net_total, (0)::numeric) AS accommodation_net,
    COALESCE(l.net_total, (0)::numeric) AS lift_pass_net,
    COALESCE(u.net_total, (0)::numeric) AS usage_net,
    ((COALESCE(s.net_total, (0)::numeric) + COALESCE(l.net_total, (0)::numeric)) + COALESCE(u.net_total, (0)::numeric)) AS estimated_net_total,
    (((COALESCE(s.vat_total, (0)::numeric) + COALESCE(l.vat_total, (0)::numeric)) + COALESCE(u.vat_total, (0)::numeric)) + COALESCE(x.vat_total, (0)::numeric)) AS estimated_vat_total,
    ((((((COALESCE(s.net_total, (0)::numeric) + COALESCE(l.net_total, (0)::numeric)) + COALESCE(u.net_total, (0)::numeric)) + COALESCE(s.vat_total, (0)::numeric)) + COALESCE(l.vat_total, (0)::numeric)) + COALESCE(u.vat_total, (0)::numeric)) + COALESCE(x.vat_total, (0)::numeric)) AS estimated_gross_total
   FROM ((((attendees a
     LEFT JOIN stay_totals s ON ((s.attendee_id = a.id)))
     LEFT JOIN lift_totals l ON ((l.attendee_id = a.id)))
     LEFT JOIN usage_totals u ON ((u.attendee_id = a.id)))
     LEFT JOIN explicit_vat_totals x ON ((x.attendee_id = a.id)));
create view public.v_invoice_readiness as  SELECT id AS attendee_id,
    event_id,
    first_name,
    surname,
    category,
    ((NOT (EXISTS ( SELECT 1
           FROM stay_charge_periods s
          WHERE ((s.attendee_id = a.id) AND ((NOT s.protocol_confirmed) OR (s.location_id IS NULL) OR (s.room_type_id IS NULL) OR (s.rate_code IS NULL) OR (s.billing_from IS NULL) OR (s.billing_to IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM booking_requests b
          WHERE ((b.attendee_id = a.id) AND COALESCE(b.accommodation_required, false) AND (NOT (EXISTS ( SELECT 1
                   FROM stay_charge_periods sx
                  WHERE (sx.attendee_id = a.id))))))))) AS accommodation_confirmed,
    ((NOT (EXISTS ( SELECT 1
           FROM lift_passes l
          WHERE ((l.attendee_id = a.id) AND l.required AND ((NOT l.protocol_confirmed) OR (l.start_date IS NULL) OR (l.end_date IS NULL) OR (l.chargeable AND (l.rate_code IS NULL))))))) AND (NOT (EXISTS ( SELECT 1
           FROM booking_requests b
          WHERE ((b.attendee_id = a.id) AND COALESCE(b.lift_pass_required, false) AND (NOT (EXISTS ( SELECT 1
                   FROM lift_passes lx
                  WHERE ((lx.attendee_id = a.id) AND lx.required))))))))) AS lift_pass_confirmed,
    data_checked,
    exception_flag,
    (data_checked AND (checked_by IS NOT NULL) AND (checked_at IS NOT NULL) AND (NOT exception_flag) AND (NOT (EXISTS ( SELECT 1
           FROM stay_charge_periods s
          WHERE ((s.attendee_id = a.id) AND ((NOT s.protocol_confirmed) OR (s.location_id IS NULL) OR (s.room_type_id IS NULL) OR (s.rate_code IS NULL) OR (s.billing_from IS NULL) OR (s.billing_to IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM booking_requests b
          WHERE ((b.attendee_id = a.id) AND COALESCE(b.accommodation_required, false) AND (NOT (EXISTS ( SELECT 1
                   FROM stay_charge_periods sx
                  WHERE (sx.attendee_id = a.id)))))))) AND (NOT (EXISTS ( SELECT 1
           FROM lift_passes l
          WHERE ((l.attendee_id = a.id) AND l.required AND ((NOT l.protocol_confirmed) OR (l.start_date IS NULL) OR (l.end_date IS NULL) OR (l.chargeable AND (l.rate_code IS NULL))))))) AND (NOT (EXISTS ( SELECT 1
           FROM booking_requests b
          WHERE ((b.attendee_id = a.id) AND COALESCE(b.lift_pass_required, false) AND (NOT (EXISTS ( SELECT 1
                   FROM lift_passes lx
                  WHERE ((lx.attendee_id = a.id) AND lx.required)))))))) AND (NOT (EXISTS ( SELECT 1
           FROM travel_records t
          WHERE ((t.attendee_id = a.id) AND t.transfer_chargeable AND (NOT t.billing_reviewed))))) AND (NOT (EXISTS ( SELECT 1
           FROM (stay_charge_periods s
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = s.rate_code) AND rc.active)))
          WHERE ((s.attendee_id = a.id) AND s.protocol_confirmed AND ((s.rate_code IS NULL) OR (rc.id IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM (lift_passes l
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = l.rate_code) AND rc.active)))
          WHERE ((l.attendee_id = a.id) AND l.required AND l.chargeable AND ((l.rate_code IS NULL) OR (rc.id IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM (usage_extras u
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = u.rate_code) AND rc.active)))
          WHERE ((u.attendee_id = a.id) AND u.chargeable AND ((u.rate_code IS NULL) OR (rc.id IS NULL))))))) AS ready_for_invoice,
    (NOT (EXISTS ( SELECT 1
           FROM travel_records t
          WHERE ((t.attendee_id = a.id) AND t.transfer_chargeable AND (NOT t.billing_reviewed))))) AS transfer_billing_reviewed,
    ( SELECT (count(*))::integer AS count
           FROM travel_records t
          WHERE ((t.attendee_id = a.id) AND t.transfer_chargeable AND (NOT t.billing_reviewed))) AS unresolved_transfer_count,
    ( SELECT (count(DISTINCT f.usage_extra_id))::integer AS count
           FROM v_usage_double_charge_flags f
          WHERE ((f.attendee_id = a.id) AND f.duplicate_dinner_risk AND (NOT f.approved_exception))) AS suppressed_dinner_count,
    (data_checked AND (checked_by IS NOT NULL) AND (checked_at IS NOT NULL)) AS checked_audit_complete,
    ((NOT (EXISTS ( SELECT 1
           FROM (stay_charge_periods s
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = s.rate_code) AND rc.active)))
          WHERE ((s.attendee_id = a.id) AND s.protocol_confirmed AND ((s.rate_code IS NULL) OR (rc.id IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM (lift_passes l
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = l.rate_code) AND rc.active)))
          WHERE ((l.attendee_id = a.id) AND l.required AND l.chargeable AND ((l.rate_code IS NULL) OR (rc.id IS NULL)))))) AND (NOT (EXISTS ( SELECT 1
           FROM (usage_extras u
             LEFT JOIN rate_card rc ON (((rc.event_id = a.event_id) AND (rc.rate_code = u.rate_code) AND rc.active)))
          WHERE ((u.attendee_id = a.id) AND u.chargeable AND ((u.rate_code IS NULL) OR (rc.id IS NULL))))))) AS rate_lookup_complete
   FROM attendees a;
create view public.v_finance_attendee_queue as  SELECT r.attendee_id,
    r.event_id,
    r.first_name,
    r.surname,
    r.category,
    r.accommodation_confirmed,
    r.lift_pass_confirmed,
    r.data_checked,
    r.exception_flag,
    r.ready_for_invoice,
    b.accommodation_total,
    b.lift_pass_total,
    b.usage_total,
    b.subtotal_before_adjustments,
    a.billing_account_organisation_id,
    o.organisation_name AS billing_organisation,
    ( SELECT i.id
           FROM invoices i
          WHERE ((i.attendee_id = r.attendee_id) AND (i.invoice_type = 'individual'::text))
          ORDER BY i.created_at DESC
         LIMIT 1) AS latest_invoice_id,
    ( SELECT i.status
           FROM invoices i
          WHERE ((i.attendee_id = r.attendee_id) AND (i.invoice_type = 'individual'::text))
          ORDER BY i.created_at DESC
         LIMIT 1) AS latest_invoice_status,
    ( SELECT i.invoice_reference
           FROM invoices i
          WHERE ((i.attendee_id = r.attendee_id) AND (i.invoice_type = 'individual'::text))
          ORDER BY i.created_at DESC
         LIMIT 1) AS latest_invoice_reference
   FROM (((v_invoice_readiness r
     JOIN v_attendee_billing_summary b ON ((b.attendee_id = r.attendee_id)))
     JOIN attendees a ON ((a.id = r.attendee_id)))
     LEFT JOIN organisations o ON ((o.id = a.billing_account_organisation_id)));
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_orgs_updated BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_event_sponsors_updated BEFORE UPDATE ON public.event_sponsors FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_attendees_updated BEFORE UPDATE ON public.attendees FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_travel_updated BEFORE UPDATE ON public.travel_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_stays_updated BEFORE UPDATE ON public.stay_charge_periods FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_lift_updated BEFORE UPDATE ON public.lift_passes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_rates_updated BEFORE UPDATE ON public.rate_card FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_usage_updated BEFORE UPDATE ON public.usage_extras FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_schedule_updated BEFORE UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_announcements_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bios_updated BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON public.table_plans FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_attendees AFTER INSERT OR DELETE OR UPDATE ON public.attendees FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_stays AFTER INSERT OR DELETE OR UPDATE ON public.stay_charge_periods FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_lift AFTER INSERT OR DELETE OR UPDATE ON public.lift_passes FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_usage AFTER INSERT OR DELETE OR UPDATE ON public.usage_extras FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_rates AFTER INSERT OR DELETE OR UPDATE ON public.rate_card FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_adjustments AFTER INSERT OR DELETE OR UPDATE ON public.invoice_adjustments FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER trg_calculate_stay_charge BEFORE INSERT OR UPDATE OF billing_from, billing_to, rate_code, attendee_id ON public.stay_charge_periods FOR EACH ROW EXECUTE FUNCTION calculate_stay_charge();
CREATE TRIGGER trg_calculate_lift_pass_charge BEFORE INSERT OR UPDATE OF required, start_date, end_date, carre_neige_required, chargeable, rate_code, attendee_id ON public.lift_passes FOR EACH ROW EXECUTE FUNCTION calculate_lift_pass_charge();
CREATE TRIGGER trg_calculate_usage_charge BEFORE INSERT OR UPDATE OF attendee_id, category, quantity, rate_code, chargeable ON public.usage_extras FOR EACH ROW EXECUTE FUNCTION calculate_usage_charge();
CREATE TRIGGER trg_booking_request_updated_at BEFORE UPDATE ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION set_booking_request_updated_at();
CREATE TRIGGER trg_guard_invoice_lines BEFORE INSERT OR DELETE OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION private.guard_issued_invoice_lines();
CREATE TRIGGER trg_guard_invoice_adjustments BEFORE INSERT OR DELETE OR UPDATE ON public.invoice_adjustments FOR EACH ROW EXECUTE FUNCTION private.guard_issued_invoice_adjustments();
CREATE TRIGGER trg_guard_invoice_header BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION private.guard_issued_invoice_header();
CREATE TRIGGER attendees_link_auth_user AFTER INSERT OR UPDATE OF email, event_id ON public.attendees FOR EACH ROW EXECUTE FUNCTION private.link_attendee_to_existing_user();
CREATE TRIGGER trg_lock_invoice_lines BEFORE DELETE OR UPDATE ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION private.prevent_locked_invoice_line_changes();
CREATE TRIGGER trg_lock_invoice_financials BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION private.prevent_locked_invoice_rebuild();
CREATE TRIGGER trg_guard_last_active_admin BEFORE DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.guard_last_active_admin();
CREATE TRIGGER audit_profiles AFTER INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER trg_suppress_duplicate_usage_line BEFORE INSERT ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION private.suppress_duplicate_usage_line();
CREATE TRIGGER trg_event_room_inventory_updated BEFORE UPDATE ON public.event_room_inventory FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_guard_invoice_usage_line BEFORE INSERT ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION guard_invoice_usage_line();
CREATE TRIGGER trg_flag_manual_billing_category BEFORE INSERT OR UPDATE OF category ON public.attendees FOR EACH ROW EXECUTE FUNCTION flag_manual_billing_category();
CREATE TRIGGER trg_seed_event_configuration_items AFTER INSERT ON public.events FOR EACH ROW EXECUTE FUNCTION private.seed_event_configuration_items();
CREATE TRIGGER audit_event_configuration_items AFTER INSERT OR DELETE OR UPDATE ON public.event_configuration_items FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_events AFTER INSERT OR DELETE OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER trg_sync_profile_attendee_from_booking AFTER INSERT OR UPDATE OF status, attendee_id, user_id ON public.booking_requests FOR EACH ROW EXECUTE FUNCTION private.sync_profile_attendee_from_booking();
CREATE TRIGGER audit_organisations AFTER INSERT OR DELETE OR UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_event_sponsors AFTER INSERT OR DELETE OR UPDATE ON public.event_sponsors FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_sponsor_contacts AFTER INSERT OR DELETE OR UPDATE ON public.sponsor_contacts FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_invitations AFTER INSERT OR DELETE OR UPDATE ON public.invitations FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_travel_records AFTER INSERT OR DELETE OR UPDATE ON public.travel_records FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_event_room_inventory AFTER INSERT OR DELETE OR UPDATE ON public.event_room_inventory FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_intake_submissions AFTER INSERT OR DELETE OR UPDATE ON public.intake_submissions FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER audit_announcements AFTER INSERT OR DELETE OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_announcements BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_venues AFTER INSERT OR DELETE OR UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_venues BEFORE UPDATE ON public.venues FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_schedule_items AFTER INSERT OR DELETE OR UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_schedule_items BEFORE UPDATE ON public.schedule_items FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_event_documents AFTER INSERT OR DELETE OR UPDATE ON public.event_documents FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_event_documents BEFORE UPDATE ON public.event_documents FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_biographies AFTER INSERT OR DELETE OR UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_biographies BEFORE UPDATE ON public.biographies FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_table_plans AFTER INSERT OR DELETE OR UPDATE ON public.table_plans FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_table_plans BEFORE UPDATE ON public.table_plans FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_seating_tables AFTER INSERT OR DELETE OR UPDATE ON public.seating_tables FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_seating_tables BEFORE UPDATE ON public.seating_tables FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_seating_assignments AFTER INSERT OR DELETE OR UPDATE ON public.seating_assignments FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_seating_assignments BEFORE UPDATE ON public.seating_assignments FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_race_results AFTER INSERT OR DELETE OR UPDATE ON public.race_results FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_race_results BEFORE UPDATE ON public.race_results FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_event_media AFTER INSERT OR DELETE OR UPDATE ON public.event_media FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_event_media BEFORE UPDATE ON public.event_media FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_transfer_runs AFTER INSERT OR DELETE OR UPDATE ON public.transfer_runs FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_transfer_runs BEFORE UPDATE ON public.transfer_runs FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_transfer_passengers AFTER INSERT OR DELETE OR UPDATE ON public.transfer_passengers FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_transfer_passengers BEFORE UPDATE ON public.transfer_passengers FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER touch_hotel_rooms BEFORE UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_hotel_rooms AFTER INSERT OR DELETE OR UPDATE ON public.hotel_rooms FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_room_allocation_requests BEFORE UPDATE ON public.room_allocation_requests FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_room_allocation_requests AFTER INSERT OR DELETE OR UPDATE ON public.room_allocation_requests FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_hotel_room_allocations BEFORE UPDATE ON public.hotel_room_allocations FOR EACH ROW EXECUTE FUNCTION private.set_event_operation_updated_at();
CREATE TRIGGER audit_hotel_room_allocations AFTER INSERT OR DELETE OR UPDATE ON public.hotel_room_allocations FOR EACH ROW EXECUTE FUNCTION private.audit_event_operation();
CREATE TRIGGER touch_event_email_settings BEFORE UPDATE ON public.event_email_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER audit_event_email_settings AFTER INSERT OR DELETE OR UPDATE ON public.event_email_settings FOR EACH ROW EXECUTE FUNCTION private.audit_row_change();
CREATE TRIGGER link_attendee_to_existing_user AFTER INSERT OR UPDATE OF email, event_id ON public.attendees FOR EACH ROW EXECUTE FUNCTION private.link_attendee_to_existing_user();
CREATE TRIGGER trg_attendee_service_items_updated BEFORE UPDATE ON public.attendee_service_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
alter table public.organisations enable row level security;
grant select,insert,update,delete on public.organisations to authenticated;
alter table public.attendees enable row level security;
grant select,insert,update,delete on public.attendees to authenticated;
alter table public.accommodation_locations enable row level security;
grant select,insert,update,delete on public.accommodation_locations to authenticated;
alter table public.room_types enable row level security;
grant select,insert,update,delete on public.room_types to authenticated;
alter table public.stay_charge_periods enable row level security;
grant select,insert,update,delete on public.stay_charge_periods to authenticated;
alter table public.lift_passes enable row level security;
grant select,insert,update,delete on public.lift_passes to authenticated;
alter table public.rate_card enable row level security;
grant select,insert,update,delete on public.rate_card to authenticated;
alter table public.invoice_lines enable row level security;
grant select,insert,update,delete on public.invoice_lines to authenticated;
alter table public.invoice_adjustments enable row level security;
grant select,insert,update,delete on public.invoice_adjustments to authenticated;
alter table public.payments enable row level security;
grant select,insert,update,delete on public.payments to authenticated;
alter table public.venues enable row level security;
grant select,insert,update,delete on public.venues to authenticated;
alter table public.invoices enable row level security;
grant select,insert,update,delete on public.invoices to authenticated;
alter table public.profiles enable row level security;
grant select,insert,update,delete on public.profiles to authenticated;
alter table public.sponsor_contacts enable row level security;
grant select,insert,update,delete on public.sponsor_contacts to authenticated;
alter table public.audit_log enable row level security;
grant select,insert,update,delete on public.audit_log to authenticated;
alter table public.event_sponsors enable row level security;
grant select,insert,update,delete on public.event_sponsors to authenticated;
alter table public.jotform_field_mappings enable row level security;
grant select,insert,update,delete on public.jotform_field_mappings to authenticated;
alter table public.integration_settings enable row level security;
grant select,insert,update,delete on public.integration_settings to authenticated;
alter table public.jotform_webhook_events enable row level security;
grant select,insert,update,delete on public.jotform_webhook_events to authenticated;
alter table public.booking_requests enable row level security;
grant select,insert,update,delete on public.booking_requests to authenticated;
alter table public.push_subscriptions enable row level security;
grant select,insert,update,delete on public.push_subscriptions to authenticated;
alter table public.invitations enable row level security;
grant select,insert,update,delete on public.invitations to authenticated;
alter table public.event_invoice_counters enable row level security;
grant select,insert,update,delete on public.event_invoice_counters to authenticated;
alter table public.push_configuration enable row level security;
grant select,insert,update,delete on public.push_configuration to authenticated;
alter table public.user_attendee_links enable row level security;
grant select,insert,update,delete on public.user_attendee_links to authenticated;
alter table public.bootstrap_claims enable row level security;
grant select,insert,update,delete on public.bootstrap_claims to authenticated;
alter table public.usage_extras enable row level security;
grant select,insert,update,delete on public.usage_extras to authenticated;
alter table public.travel_records enable row level security;
grant select,insert,update,delete on public.travel_records to authenticated;
alter table public.event_room_inventory enable row level security;
grant select,insert,update,delete on public.event_room_inventory to authenticated;
alter table public.event_configuration_items enable row level security;
grant select,insert,update,delete on public.event_configuration_items to authenticated;
alter table public.intake_submissions enable row level security;
grant select,insert,update,delete on public.intake_submissions to authenticated;
alter table public.events enable row level security;
grant select,insert,update,delete on public.events to authenticated;
alter table public.invoice_deliveries enable row level security;
grant select,insert,update,delete on public.invoice_deliveries to authenticated;
alter table public.schedule_items enable row level security;
grant select,insert,update,delete on public.schedule_items to authenticated;
alter table public.event_documents enable row level security;
grant select,insert,update,delete on public.event_documents to authenticated;
alter table public.biographies enable row level security;
grant select,insert,update,delete on public.biographies to authenticated;
alter table public.announcements enable row level security;
grant select,insert,update,delete on public.announcements to authenticated;
alter table public.table_plans enable row level security;
grant select,insert,update,delete on public.table_plans to authenticated;
alter table public.seating_tables enable row level security;
grant select,insert,update,delete on public.seating_tables to authenticated;
alter table public.seating_assignments enable row level security;
grant select,insert,update,delete on public.seating_assignments to authenticated;
alter table public.race_results enable row level security;
grant select,insert,update,delete on public.race_results to authenticated;
alter table public.event_media enable row level security;
grant select,insert,update,delete on public.event_media to authenticated;
alter table public.transfer_runs enable row level security;
grant select,insert,update,delete on public.transfer_runs to authenticated;
alter table public.transfer_passengers enable row level security;
grant select,insert,update,delete on public.transfer_passengers to authenticated;
alter table public.hotel_rooms enable row level security;
grant select,insert,update,delete on public.hotel_rooms to authenticated;
alter table public.room_allocation_requests enable row level security;
grant select,insert,update,delete on public.room_allocation_requests to authenticated;
alter table public.hotel_room_allocations enable row level security;
grant select,insert,update,delete on public.hotel_room_allocations to authenticated;
alter table public.event_email_settings enable row level security;
grant select,insert,update,delete on public.event_email_settings to authenticated;
alter table public.notification_deliveries enable row level security;
grant select,insert,update,delete on public.notification_deliveries to authenticated;
alter table public.attendee_service_items enable row level security;
grant select,insert,update,delete on public.attendee_service_items to authenticated;
create policy "attendee_self_or_staff_read" on public.attendees as PERMISSIVE for SELECT to authenticated using ((private.is_own_attendee(id) OR private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "seating_tables_staff_delete" on public.seating_tables as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "travel_self_or_staff_read" on public.travel_records as PERMISSIVE for SELECT to authenticated using ((private.is_own_attendee(attendee_id) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text])));
create policy "event_configuration_items_staff_read" on public.event_configuration_items as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]));
create policy "stay_self_or_staff_read" on public.stay_charge_periods as PERMISSIVE for SELECT to authenticated using ((private.is_own_attendee(attendee_id) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text])));
create policy "seating_assignments_staff_insert" on public.seating_assignments as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "lift_self_or_staff_read" on public.lift_passes as PERMISSIVE for SELECT to authenticated using ((private.is_own_attendee(attendee_id) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text])));
create policy "events_role_read" on public.events as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]));
create policy "usage_self_or_staff_read" on public.usage_extras as PERMISSIVE for SELECT to authenticated using ((private.is_own_attendee(attendee_id) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text])));
create policy "documents_content_delete" on public.event_documents as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "invoice_self_or_staff_read" on public.invoices as PERMISSIVE for SELECT to authenticated using ((((attendee_id IS NOT NULL) AND private.is_own_attendee(attendee_id) AND (status = ANY (ARRAY['issued'::text, 'paid'::text]))) OR private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'protocol'::text, 'read_only'::text])));
create policy "biographies_content_insert" on public.biographies as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "staff can read intake submissions" on public.intake_submissions as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'finance'::text, 'read_only'::text]));
create policy "protocol staff can update intake submissions" on public.intake_submissions as PERMISSIVE for UPDATE to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text])) with check (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]));
create policy "org_staff_read" on public.organisations as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]));
create policy "biographies_content_update" on public.biographies as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_sponsors_staff_read" on public.event_sponsors as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]));
create policy "public web intake insert" on public.intake_submissions as PERMISSIVE for INSERT to anon with check (((source = 'web'::text) AND (processing_status = 'pending'::text) AND (protocol_reviewed_by IS NULL) AND (protocol_reviewed_at IS NULL) AND (error_message IS NULL)));
create policy "sponsor_contacts_staff_read" on public.sponsor_contacts as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text]));
create policy "biographies_content_delete" on public.biographies as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "invitations_staff_read" on public.invitations as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'read_only'::text]));
create policy "seating_assignments_staff_update" on public.seating_assignments as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "locations_read" on public.accommodation_locations as PERMISSIVE for SELECT to authenticated using (true);
create policy "rooms_read" on public.room_types as PERMISSIVE for SELECT to authenticated using (true);
create policy "race_results_content_insert" on public.race_results as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "rate_staff_read" on public.rate_card as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'protocol'::text, 'read_only'::text]));
create policy "race_results_content_update" on public.race_results as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "seating_assignments_staff_delete" on public.seating_assignments as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "transfer_runs_protocol_insert" on public.transfer_runs as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "attendee_protocol_update" on public.attendees as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "race_results_content_delete" on public.race_results as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_media_content_insert" on public.event_media as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_media_content_update" on public.event_media as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_media_content_delete" on public.event_media as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "invoice_deliveries_finance_read" on public.invoice_deliveries as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'read_only'::text]) AS has_staff_role));
create policy "table_plans_staff_insert" on public.table_plans as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "adjustments_staff_read" on public.invoice_adjustments as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'protocol'::text, 'read_only'::text]));
create policy "payments_staff_read" on public.payments as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'protocol'::text, 'read_only'::text]));
create policy "audit_admin_read" on public.audit_log as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text]));
create policy "booking_request_self_read" on public.booking_requests as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text])));
create policy "venues_public_read" on public.venues as PERMISSIVE for SELECT to anon using ((published AND active));
create policy "table_plans_staff_update" on public.table_plans as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "venues_authenticated_read" on public.venues as PERMISSIVE for SELECT to authenticated using (((published AND active) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "schedule_public_read" on public.schedule_items as PERMISSIVE for SELECT to anon using (published);
create policy "schedule_authenticated_read" on public.schedule_items as PERMISSIVE for SELECT to authenticated using ((published OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "documents_public_read" on public.event_documents as PERMISSIVE for SELECT to anon using (published);
create policy "documents_authenticated_read" on public.event_documents as PERMISSIVE for SELECT to authenticated using ((published OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "biographies_public_read" on public.biographies as PERMISSIVE for SELECT to anon using (published);
create policy "biographies_authenticated_read" on public.biographies as PERMISSIVE for SELECT to authenticated using ((published OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "user_attendee_links_self_read" on public.user_attendee_links as PERMISSIVE for SELECT to authenticated using (((user_id = ( SELECT auth.uid() AS uid)) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text])));
create policy "profiles_self_read" on public.profiles as PERMISSIVE for SELECT to authenticated using (((id = ( SELECT auth.uid() AS uid)) OR private.has_staff_role(ARRAY['admin'::text])));
create policy "table_plans_attendee_read" on public.table_plans as PERMISSIVE for SELECT to authenticated using ((private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]) OR (published AND private.is_event_attendee(event_id))));
create policy "push_subscriptions_self" on public.push_subscriptions as PERMISSIVE for ALL to authenticated using ((user_id = ( SELECT auth.uid() AS uid))) with check ((user_id = ( SELECT auth.uid() AS uid)));
create policy "invoice_lines_self_or_staff_read" on public.invoice_lines as PERMISSIVE for SELECT to authenticated using ((((attendee_id IS NOT NULL) AND private.is_own_attendee(attendee_id) AND (EXISTS ( SELECT 1
   FROM invoices i
  WHERE ((i.id = invoice_lines.invoice_id) AND (i.status = ANY (ARRAY['issued'::text, 'paid'::text])))))) OR private.has_staff_role(ARRAY['admin'::text, 'finance'::text, 'protocol'::text, 'read_only'::text])));
create policy "seating_tables_attendee_read" on public.seating_tables as PERMISSIVE for SELECT to authenticated using ((private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]) OR (EXISTS ( SELECT 1
   FROM table_plans tp
  WHERE ((tp.id = seating_tables.table_plan_id) AND tp.published AND private.is_event_attendee(tp.event_id))))));
create policy "seating_assignments_attendee_read" on public.seating_assignments as PERMISSIVE for SELECT to authenticated using ((private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]) OR (EXISTS ( SELECT 1
   FROM (seating_tables st
     JOIN table_plans tp ON ((tp.id = st.table_plan_id)))
  WHERE ((st.id = seating_assignments.seating_table_id) AND tp.published AND private.is_event_attendee(tp.event_id))))));
create policy "rooms_write_delete" on public.room_types as PERMISSIVE for DELETE to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "race_results_public_read" on public.race_results as PERMISSIVE for SELECT to anon using (published);
create policy "race_results_authenticated_read" on public.race_results as PERMISSIVE for SELECT to authenticated using ((published OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "event_media_public_read" on public.event_media as PERMISSIVE for SELECT to anon using (published);
create policy "event_media_authenticated_read" on public.event_media as PERMISSIVE for SELECT to authenticated using ((published OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "notification_deliveries_staff_read" on public.notification_deliveries as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text]) AS has_staff_role));
create policy "table_plans_staff_delete" on public.table_plans as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "hotel_rooms_staff_read" on public.hotel_rooms as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text]) AS has_staff_role));
create policy "seating_tables_staff_insert" on public.seating_tables as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "seating_tables_staff_update" on public.seating_tables as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "hotel_rooms_protocol_insert" on public.hotel_rooms as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "hotel_rooms_protocol_update" on public.hotel_rooms as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "hotel_rooms_protocol_delete" on public.hotel_rooms as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "room_allocation_requests_staff_read" on public.room_allocation_requests as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text]) AS has_staff_role));
create policy "room_allocation_requests_protocol_insert" on public.room_allocation_requests as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "room_allocation_requests_protocol_update" on public.room_allocation_requests as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "room_allocation_requests_protocol_delete" on public.room_allocation_requests as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "hotel_room_allocations_staff_read" on public.hotel_room_allocations as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text]) AS has_staff_role));
create policy "locations_write_insert" on public.accommodation_locations as PERMISSIVE for INSERT to authenticated with check (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "locations_write_update" on public.accommodation_locations as PERMISSIVE for UPDATE to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text])) with check (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "locations_write_delete" on public.accommodation_locations as PERMISSIVE for DELETE to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "rooms_write_insert" on public.room_types as PERMISSIVE for INSERT to authenticated with check (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "rooms_write_update" on public.room_types as PERMISSIVE for UPDATE to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text])) with check (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text]));
create policy "announcements_content_delete" on public.announcements as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "venues_content_insert" on public.venues as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "venues_content_update" on public.venues as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "hotel_room_allocations_protocol_insert" on public.hotel_room_allocations as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "hotel_room_allocations_protocol_update" on public.hotel_room_allocations as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "hotel_room_allocations_protocol_delete" on public.hotel_room_allocations as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "announcements_content_insert" on public.announcements as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "announcements_content_update" on public.announcements as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_email_settings_admin_read" on public.event_email_settings as PERMISSIVE for SELECT to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text]) AS has_staff_role));
create policy "announcements_public_read" on public.announcements as PERMISSIVE for SELECT to anon using ((published AND (publish_at <= now()) AND ((expires_at IS NULL) OR (expires_at > now())) AND ('all'::text = ANY (audience))));
create policy "venues_content_delete" on public.venues as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "announcements_authenticated_read" on public.announcements as PERMISSIVE for SELECT to authenticated using (((published AND (publish_at <= now()) AND ((expires_at IS NULL) OR (expires_at > now())) AND private.current_user_matches_announcement_audience(event_id, audience)) OR private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'content_manager'::text, 'read_only'::text])));
create policy "schedule_content_insert" on public.schedule_items as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "schedule_content_update" on public.schedule_items as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "schedule_content_delete" on public.schedule_items as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "documents_content_insert" on public.event_documents as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "documents_content_update" on public.event_documents as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'operations'::text, 'content_manager'::text]) AS has_staff_role));
create policy "event_room_inventory_read" on public.event_room_inventory as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'sponsor_manager'::text, 'protocol'::text, 'finance'::text, 'operations'::text, 'read_only'::text]));
create policy "transfer_runs_protocol_update" on public.transfer_runs as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "transfer_runs_protocol_delete" on public.transfer_runs as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "transfer_passengers_protocol_insert" on public.transfer_passengers as PERMISSIVE for INSERT to authenticated with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "transfer_passengers_protocol_update" on public.transfer_passengers as PERMISSIVE for UPDATE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role)) with check (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "transfer_passengers_protocol_delete" on public.transfer_passengers as PERMISSIVE for DELETE to authenticated using (( SELECT private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text]) AS has_staff_role));
create policy "transfer_runs_attendee_read" on public.transfer_runs as PERMISSIVE for SELECT to authenticated using ((private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text]) OR (published AND (status <> 'cancelled'::text) AND private.is_event_attendee(event_id) AND (private.is_own_attendee(lead_traveller_attendee_id) OR (EXISTS ( SELECT 1
   FROM transfer_passengers tp
  WHERE ((tp.transfer_run_id = transfer_runs.id) AND private.is_own_attendee(tp.attendee_id))))))));
create policy "transfer_passengers_attendee_read" on public.transfer_passengers as PERMISSIVE for SELECT to authenticated using ((private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'read_only'::text]) OR private.is_own_attendee(attendee_id)));
create policy "attendee_service_items_staff_read" on public.attendee_service_items as PERMISSIVE for SELECT to authenticated using (private.has_staff_role(ARRAY['admin'::text, 'protocol'::text, 'operations'::text, 'finance'::text, 'read_only'::text]));