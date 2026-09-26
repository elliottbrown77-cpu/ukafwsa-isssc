"""Build a deterministic, contact-sanitised 2026 replay seed. Never connects to a database.
Usage: python scripts/import-2026.py DATABASE.xlsm INVOICING.xlsx --out .local/replay
Requires openpyxl. Workbook macros are never executed; cached values are read.
"""
import argparse,collections,datetime,hashlib,json,re,uuid
from decimal import Decimal
from pathlib import Path
import openpyxl
P=argparse.ArgumentParser();P.add_argument('database');P.add_argument('invoicing');P.add_argument('--out',default='.local/replay');a=P.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
EVENT='26352026-0000-4000-8000-000000000035'
def uid(key):return str(uuid.uuid5(uuid.UUID(EVENT),str(key)))
def cash(v):return Decimal(str(v or 0)).quantize(Decimal('.01'))
def date(v):
 if v is None or str(v).strip() in ('','0','N/A','n/a','TBC','tbc'):return None
 if isinstance(v,(datetime.date,datetime.datetime)):return v.strftime('%Y-%m-%d')
 for fmt in ('%d/%m/%Y','%Y-%m-%d','%d/%m/%y'):
  try:return datetime.datetime.strptime(str(v).strip(),fmt).strftime('%Y-%m-%d')
  except ValueError:pass
 raise ValueError('Unrecognised date '+str(v))
def sql(v):
 if v is None:return 'null'
 if isinstance(v,bool):return 'true' if v else 'false'
 if isinstance(v,(int,float,Decimal)):return str(v)
 return "'"+str(v).replace("'","''")+"'"
def insert(table,row):return 'insert into public.'+table+'('+','.join(row)+') values('+','.join(sql(v) for v in row.values())+');'
def key(first,last):return (str(first).strip().casefold(),str(last).strip().casefold())
w=openpyxl.load_workbook(a.database,data_only=True,keep_vba=False);lea=openpyxl.load_workbook(a.invoicing,data_only=True)
db=[(i,r) for i,r in enumerate(w['Database'].values,1) if i>1 and r[2] and r[3]]
bill=[(i,r) for i,r in enumerate(w['Billing Master'].values,1) if i>1 and r[1] and r[2]]
final=[(i,r) for i,r in enumerate(lea['Sheet1'].values,1) if i>1 and r[3] and r[4] and isinstance(r[11],(int,float))]
# Match by names, hotel and room type; preserve separate periods rather than multiplying people.
by_person=collections.defaultdict(list)
for i,r in db:by_person[key(r[2],r[3])].append((i,r))
checks=[];statements=[];expected=[];people={};rates={};locations={};rooms={};warnings=[]
for k,rows in by_person.items():
 i,r=rows[0];pid=uid('person:'+str(k));people[k]=pid
 company=str(r[7] or '');category='Sponsor Guest' if 'guest' in company.lower() else 'Sponsor'
 if any(x in company.lower() for x in ['committee','protocol','hill','mil vip']):category='Other'
 statements.append(insert('attendees',dict(id=pid,event_id=EVENT,serial_number='TEST-2026-'+str(r[0]),first_name=r[2],surname=r[3],title_rank=r[1],known_as=r[6],display_company=company,position_role=r[8],category=category,email='replay-'+pid+'@example.invalid',mobile=None,record_source='protocol_manual',protocol_notes='Historic replay; contacts sanitised. Source Database rows '+','.join(str(x[0]) for x in rows))))
 # Travel from canonical Database only, never stale derived Transfers tabs.
 for direction,airport,flight,day,time,transfer in [('arrival',16,17,18,19,20),('departure',21,22,23,24,25)]:
  seen=set()
  travel_rows=sorted(rows,key=lambda pair: date(pair[1][day]) or '',reverse=direction=='departure')
  for rownum,x in travel_rows:
   d=date(x[day]);tm=x[time]
   if not d:continue
   if not d.startswith('2026-'):warnings.append({'sheet':'Database','row':rownum,'field':direction,'reason':'Non-2026 travel date omitted'});continue
   t=tm.strftime('%H:%M:%S') if isinstance(tm,datetime.time) else '00:00:00'
   sig=(d,t,x[airport],x[flight])
   if sig in seen:continue
   if seen:
    warnings.append({'sheet':'Database','row':rownum,'field':direction,'date':d,'time':t,'location':x[airport],'travel_number':x[flight],'reason':'Additional travel leg retained in import manifest; existing app supports one arrival/departure per attendee'});continue
   seen.add(sig);requested=bool(x[transfer] and str(x[transfer]).lower() not in ('no','n','not required'))
   statements.append(insert('travel_records',dict(id=uid(f'travel:{pid}:{direction}:{sig}'),attendee_id=pid,direction=direction,method_of_transport='Flight' if x[flight] else 'Other',airport_station=x[airport],flight_travel_number=x[flight],travel_datetime=d+'T'+t+'+01:00',transfer_requested=requested,transfer_service=str(x[transfer] or ''),transfer_chargeable=False,billing_reviewed=True,billing_review_notes='Historic 2026 replay: no transfer package in historic bill',protocol_confirmed=False)))
# Approved rates are taken from the historic pricing sheet, not the current event.
for i,r in enumerate(w['Pricing Sheet'].values,1):
 if 2<=i<=31 and isinstance(r[2],(int,float)):
  hotel,room,price=r[:3];lid=uid('hotel:'+hotel);rid=uid('room:'+hotel+':'+room)
  if hotel not in locations:locations[hotel]=lid
  rooms[(hotel,room)]=rid;rates[(hotel,room)]='2026_ROOM_'+str(i)
  checks.append(insert('rate_card',dict(id=uid('rate:'+str(i)),event_id=EVENT,rate_code=rates[(hotel,room)],charge_category='accommodation',location_id=lid,room_type_id=rid,description=hotel+' / '+room,unit='night',unit_price=price,vat_rate=0,status='approved',active=True,source_note='Historic Pricing Sheet row '+str(i),includes_dinner=False)))
extras=[('ADMIN_ONLY','admin','package',0,None),('LIFT_STANDARD','lift_pass','day',65,None),('LIFT_CARRE','lift_pass','day',67,None),('CHAMPAGNE','champagne','bottle',33.34,'2026_CHAMPAGNE_VAT'),('CHAMPAGNE_VAT','champagne','bottle',6.66,None),('DINNER_ETERLOU','dinner','meal',60,None),('DINNER_TREMPLIN','dinner','meal',25,None),('LESSON_GROUP','lesson_group','lesson',121,None),('LESSON_PRIVATE','lesson_private','lesson',325,None),('LESSON_TELEMARK','lesson_telemark','lesson',130,None)]
for code,cat,unit,price,pair in extras:checks.append(insert('rate_card',dict(id=uid('rate:'+code),event_id=EVENT,rate_code='2026_'+code,charge_category=cat,description='Historic '+code.replace('_',' '),unit=unit,unit_price=price,vat_rate=0,status='approved',active=True,paired_rate_code=pair,tax_treatment='explicit_vat_amount' if code=='CHAMPAGNE_VAT' else None,source_note='Historic Pricing Sheet')))
used_source_rows=set()
for rownum,r in bill:
 k=key(r[1],r[2]);pid=people[k];matches=[(i,x) for i,x in by_person[k] if x[9]==r[5] and x[10]==r[6] and i not in used_source_rows and (not r[7] or (date(x[14]) and date(x[15]) and (datetime.date.fromisoformat(date(x[15]))-datetime.date.fromisoformat(date(x[14]))).days==int(r[7])))]
 if not matches:raise ValueError('No operational source match for Billing Master row '+str(rownum))
 source_row,x=matches[0];used_source_rows.add(source_row);hotel,room=r[5],r[6];rc=rates.get((hotel,room));n=int(r[7] or 0)
 if not rc:raise ValueError('Missing historic room rate: '+str((hotel,room)))
 if cash(r[9])!=cash(Decimal(n)*cash(r[8])):raise ValueError('Accommodation mismatch at row '+str(rownum))
 start=date(x[14]);end=date(x[15]);
 if n and (not start or not end or (datetime.date.fromisoformat(end)-datetime.date.fromisoformat(start)).days!=n):raise ValueError('Billing date/nights mismatch at row '+str(rownum))
 statements.append(insert('stay_charge_periods',dict(id=uid('stay:'+str(rownum)),attendee_id=pid,location_id=locations[hotel],room_type_id=rooms[(hotel,room)],requested_location=hotel,requested_share_with=x[11],actual_check_in=date(x[12]),actual_check_out=date(x[13]),billing_from=start,billing_to=end,rate_code=rc,protocol_confirmed=True)))
 days=int(r[10] or 0)
 if days:
  rate=cash(r[11])/days
  if rate not in (0,65,67):raise ValueError('Unknown lift rate '+str(rate))
  ls=date(x[26]);le=date(x[27]);
  if not ls or not le or (datetime.date.fromisoformat(le)-datetime.date.fromisoformat(ls)).days+1!=days:raise ValueError('Lift date/day mismatch at Billing Master row '+str(rownum))
  statements.append(insert('lift_passes',dict(id=uid('lift:'+str(rownum)),attendee_id=pid,required=True,start_date=ls,end_date=le,carre_neige_required=rate==67,chargeable=rate!=0,rate_code='2026_LIFT_CARRE' if rate==67 else '2026_LIFT_STANDARD',protocol_confirmed=True,notes='Historic Billing Master row '+str(rownum))))
 for col,code,cat in [(12,'CHAMPAGNE','champagne'),(17,'DINNER_ETERLOU','dinner'),(18,'DINNER_TREMPLIN','dinner'),(20,'LESSON_GROUP','lesson_group'),(22,'LESSON_PRIVATE','lesson_private'),(24,'LESSON_TELEMARK','lesson_telemark')]:
  qty=r[col] or 0
  if qty:
   xid=uid(f'extra:{rownum}:{col}');statements.append(insert('usage_extras',dict(id=xid,attendee_id=pid,category=cat,quantity=qty,rate_code='2026_'+code,chargeable=True,notes='Historic Billing Master row '+str(rownum))))
   statements.append(insert('attendee_service_items',dict(id=uid(f'service:{rownum}:{col}'),attendee_id=pid,service_type='lesson' if 'LESSON' in code else cat,title=code.replace('_',' ').title(),status='confirmed',quantity=qty,chargeable=True,rate_code='2026_'+code,usage_extra_id=xid,attendee_details='Historic service; exact service date not recorded')))
 expected.append({'source_row':rownum,'attendee_id':pid,'accommodation':float(cash(r[9])),'lift_pass':float(cash(r[11])),'champagne_net':float(cash(r[14])),'champagne_vat':float(cash(r[16])),'dinner':float(cash(r[19])),'lesson':float(cash(r[26])),'gross':float(cash(r[27]))})
pre=["begin;", "-- Set request.jwt.claim.sub to the reviewing Admin's UUID before running this seed.","do $$ begin perform private.require_actor_role(auth.uid(),array['admin']); if exists(select 1 from public.events where id='"+EVENT+"') then raise exception 'Replay already exists; import aborted without changes';end if;end $$;",insert('events',dict(id=EVENT,name='ISSSC 2026 Test Replay',event_year=2026,start_date='2026-01-28',midweek_changeover_date='2026-02-04',end_date='2026-02-09',invoice_prefix='TEST-2026',active=False,is_test=True,delivery_disabled=True,notes='Isolated historic replay; never activate or deliver invoices'))]
pre += [insert('accommodation_locations',dict(id=lid,name='TEST 2026 — '+hotel,location_type='hotel',active=False)) for hotel,lid in locations.items()]
pre += [insert('room_types',dict(id=rid,location_id=locations[hotel],name=room,active=False)) for (hotel,room),rid in rooms.items()]
pre += checks
(out/'seed.sql').write_text('\n'.join(pre+statements+['commit;']))
(out/'expected.json').write_text(json.dumps(expected,indent=2))
final_expected=[{'row':i,'name':str(r[3]).strip()+' '+str(r[4]).strip(),'company':r[1],'gross':float(cash(r[11])),'components_total':float(sum(cash(v) for v in r[5:11]))} for i,r in final]
(out/'final-invoices.json').write_text(json.dumps(final_expected,indent=2))
manifest={'event_id':EVENT,'people':len(people),'billing_rows':len(bill),'billing_total':float(sum(cash(r[27]) for _,r in bill)),'historic_invoice_rows':len(final),'historic_final_total':float(sum(cash(r[11]) for _,r in final)),'sources':[{'filename':Path(f).name,'sha256':hashlib.sha256(Path(f).read_bytes()).hexdigest()} for f in [a.database,a.invoicing]],'warnings':warnings+['Derived Hotel Room Allocation and Transfers tabs contain stale years; imported from Database instead.','Contact emails replaced with example.invalid; mobiles omitted.','Equipment details are not recorded in these workbooks. No equipment bookings invented.','No physical room numbers or transfer vehicle allocations were invented.','Two final invoice reductions and split/consolidated payer arrangements require explicit reconciliation.']}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2));print(json.dumps(manifest,indent=2))
