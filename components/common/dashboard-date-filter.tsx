'use client'
import { CalendarDays } from 'lucide-react'
import { useApp } from '@/components/providers'
export type DashboardDateFilterValue = { year:number|null; month:number|null; week:string|null; day:string|null }
type WeekRange={start:string;end:string}
const toISODate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const getWeeks=(year:number,month:number):WeekRange[]=>{const lastDay=new Date(year,month,0,12).getDate(),ranges:WeekRange[]=[];let day=1;while(day<=lastDay){const startDate=new Date(year,month-1,day,12),endDay=Math.min(day+(7-startDate.getDay())%7,lastDay);ranges.push({start:toISODate(startDate),end:toISODate(new Date(year,month-1,endDay,12))});day=endDay+1}return ranges}
const inputClassName='h-8 min-w-0 rounded-lg border bg-card px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50'
export function DashboardDateFilter({value,years,locale,onChange}:{value:DashboardDateFilterValue;years:number[];locale:'en'|'id';onChange:(value:DashboardDateFilterValue)=>void}){
 const {t}=useApp(),months=Array.from({length:12},(_,i)=>i+1)
 const weeks=value.year!==null&&value.month!==null?getWeeks(value.year,value.month):[]
 const days=value.week?(()=>{const week=weeks.find(x=>x.start===value.week);if(!week)return[];const result:string[]=[],cursor=new Date(`${week.start}T12:00:00`),end=new Date(`${week.end}T12:00:00`);while(cursor<=end){result.push(toISODate(cursor));cursor.setDate(cursor.getDate()+1)}return result})():[]
 const dateLabel=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(`${date}T12:00:00`).toLocaleDateString(locale==='en'?'en-US':'id-ID',options)
 const weekLabel=(week:WeekRange,index:number)=>`${t('dash.filter.weekLabel',{n:index+1})} · ${dateLabel(week.start,{day:'numeric',month:'short'})}–${dateLabel(week.end,{day:'numeric',month:'short'})}`
 return <div className="flex flex-wrap items-center gap-2" aria-label={t('dash.filter.label')}>
  <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
  <select value={value.year===null?'':String(value.year)} onChange={e=>{const year=e.target.value===''?null:Number(e.target.value);onChange({year,month:null,week:null,day:null})}} aria-label={t('dash.filter.year')} className={inputClassName}><option value="">{t('dash.filter.allYears')}</option>{years.map(year=><option key={year} value={year}>{year}</option>)}</select>
  <select value={value.month===null?'':String(value.month)} onChange={e=>onChange({...value,month:e.target.value===''?null:Number(e.target.value),week:null,day:null})} aria-label={t('dash.filter.month')} className={inputClassName} disabled={value.year===null}><option value="">{t('dash.filter.allMonths')}</option>{months.map(month=><option key={month} value={month}>{new Date(2020,month-1,1,12).toLocaleDateString(locale==='en'?'en-US':'id-ID',{month:'long'})}</option>)}</select>
  <select value={value.week??''} onChange={e=>onChange({...value,week:e.target.value||null,day:null})} aria-label={t('dash.filter.week')} className={inputClassName} disabled={value.year===null||value.month===null}><option value="">{t('dash.filter.allWeeks')}</option>{weeks.map((week,index)=><option key={week.start} value={week.start}>{weekLabel(week,index)}</option>)}</select>
  <select value={value.day??''} onChange={e=>onChange({...value,day:e.target.value||null})} aria-label={t('dash.filter.day')} className={inputClassName} disabled={value.week===null}><option value="">{t('dash.filter.allDays')}</option>{days.map(day=><option key={day} value={day}>{dateLabel(day,{weekday:'short',day:'numeric',month:'short'})}</option>)}</select>
 </div>
}
