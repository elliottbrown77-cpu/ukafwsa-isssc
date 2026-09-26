"""Reconcile cached workbook values separately from the application-engine test."""
import argparse,collections,json,re
from decimal import Decimal
from pathlib import Path
import openpyxl
p=argparse.ArgumentParser();p.add_argument('database');p.add_argument('invoicing');p.add_argument('--out',default='.local/replay/historic-reconciliation.json');a=p.parse_args()
w=openpyxl.load_workbook(a.database,data_only=True);l=openpyxl.load_workbook(a.invoicing,data_only=True)
def money(v):return Decimal(str(v or 0)).quantize(Decimal('.01'))
def name(first,last):return (str(first or '').strip()+' '+str(last or '').strip()).lower()
b=collections.defaultdict(Decimal);f=collections.defaultdict(Decimal);dinners=[];companies={}
for r in list(w['Billing Master'].values)[1:]:
 if r[1] and r[2]:
  n=name(r[1],r[2]);b[n]+=money(r[27]);companies[n]=r[4]
for i,r in enumerate(list(l['Sheet1'].values)[1:],2):
 if r[3] and r[4] and isinstance(r[11],(int,float)):
  n=name(r[3],r[4]);f[n]+=money(r[11]);line_total=sum(money(v) for v in r[5:11]);
  if line_total!=money(r[11]):dinners.append({'source_row':i,'component_total':float(line_total),'final':float(money(r[11])),'difference':float(line_total-money(r[11]))})
diffs=[{'name':n,'company':companies.get(n),'calculated':float(b[n]),'final':float(f[n]),'delta':float(f[n]-b[n])} for n in sorted(set(b)|set(f)) if b[n]!=f[n]]
# Explicit historical payer consolidations and spelling alias; compare totals, never alter invoices.
groups=[('Air Tanker',['mark alexander','mick soul','nicola alexander','olivier ast','paul kimberley','rachael soul']),('Met Police',['andy carr','frances learner','neil bazzoni','simon tite','steven tanner']),('Brookes',['thomas brookes','laura brookes']),('Davis alias',['steven davis','steve davis'])]
covered=set();group_checks=[]
for label,names in groups:
 covered.update(names);before=sum(b[n] for n in names);after=sum(f[n] for n in names)
 group_checks.append({'group':label,'calculated':float(before),'final':float(after),'difference':float(after-before)})
remaining=[r for r in diffs if r['name'] not in covered]
result={'calculated':float(sum(b.values())),'final':float(sum(f.values())),'difference':float(sum(f.values())-sum(b.values())),'payer_group_checks':group_checks,'observed_final_reductions':remaining,'manual_component_differences':dinners,'note':'Final workbook reductions are observed differences, not authorisation to modify invoices. They are not silently imported into billing.'}
assert all(g['difference']==0 for g in group_checks), 'Historic payer groups no longer reconcile'
assert {r['name']:r['delta'] for r in remaining}=={'anna haw':-20.43,'dickie haldenby':-866.25}, 'Historic reductions changed'
Path(a.out).write_text(json.dumps(result,indent=2));print(json.dumps({'calculated':result['calculated'],'final':result['final'],'difference':result['difference'],'payer_groups_matched':len(group_checks),'observed_reductions':len(remaining)}))
