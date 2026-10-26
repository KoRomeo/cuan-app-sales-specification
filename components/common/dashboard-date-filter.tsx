'use client'
import { CalendarDays } from 'lucide-react'
import { useApp } from '@/components/providers'
import { SearchableSelect } from '@/components/common/searchable-select'
export type DashboardDateFilterValue = { year:number|null; month:number|null; week:string|null; day:string|null }
type WeekRange={start:string;end:string}
const toISODate=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
const getWeeks=(year:number,month:number):WeekRange[]=>{const lastDay=new Date(year,month,0,12).getDate(),ranges:WeekRange[]=[];let day=1;while(day<=lastDay){const startDate=new Date(year,month-1,day,12),endDay=Math.min(day+(7-startDate.getDay())%7,lastDay);ranges.push({start:toISODate(startDate),end:toISODate(new Date(year,month-1,endDay,12))});day=endDay+1}return ranges}

export function DashboardDateFilter({value,years,locale,onChange}:{value:DashboardDateFilterValue;years:number[];locale:'en'|'id';onChange:(value:DashboardDateFilterValue)=>void}){
 const {t}=useApp(),months=Array.from({length:12},(_,i)=>i+1)
 const weeks=value.year!==null&&value.month!==null?getWeeks(value.year,value.month):[]
 const days=value.week?(()=>{const week=weeks.find(x=>x.start===value.week);if(!week)return[];const result:string[]=[],cursor=new Date(`${week.start}T12:00:00`),end=new Date(`${week.end}T12:00:00`);while(cursor<=end){result.push(toISODate(cursor));cursor.setDate(cursor.getDate()+1)}return result})():[]
 const dateLabel=(date:string,options:Intl.DateTimeFormatOptions)=>new Date(`${date}T12:00:00`).toLocaleDateString(locale==='en'?'en-US':'id-ID',options)
 const weekLabel=(week:WeekRange,index:number)=>`${t('dash.filter.weekLabel',{n:index+1})} · ${dateLabel(week.start,{day:'numeric',month:'short'})}–${dateLabel(week.end,{day:'numeric',month:'short'})}`
 return <div className="flex flex-wrap items-center gap-2" aria-label={t('dash.filter.label')}>
  <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true"/>
  <div className="min-w-24"><SearchableSelect id="dash-filter-year" value={value.year===null?'':String(value.year)} onChange={next=>{const year=String(next)===''?null:Number(next);onChange({year,month:null,week:null,day:null})}} aria-label={t('dash.filter.year')} options={[{value:'',label:t('dash.filter.allYears')},...years.map(year=>({value:String(year),label:String(year)}))]} placeholder={t('dash.filter.allYears')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} /></div>
  <div className="min-w-28"><SearchableSelect id="dash-filter-month" value={value.month===null?'':String(value.month)} onChange={next=>onChange({...value,month:String(next)===''?null:Number(next),week:null,day:null})} disabled={value.year===null} options={[{value:'',label:t('dash.filter.allMonths')},...months.map(month=>({value:String(month),label:new Date(2020,month-1,1,12).toLocaleDateString(locale==='en'?'en-US':'id-ID',{month:'long'})}))]} placeholder={t('dash.filter.allMonths')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} /></div>
  <div className="min-w-40"><SearchableSelect id="dash-filter-week" value={value.week??''} onChange={next=>onChange({...value,week:String(next)||null,day:null})} disabled={value.year===null||value.month===null} options={[{value:'',label:t('dash.filter.allWeeks')},...weeks.map((week,index)=>({value:week.start,label:weekLabel(week,index)}))]} placeholder={t('dash.filter.allWeeks')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} /></div>
  <div className="min-w-36"><SearchableSelect id="dash-filter-day" value={value.day??''} onChange={next=>onChange({...value,day:String(next)||null})} disabled={value.week===null} options={[{value:'',label:t('dash.filter.allDays')},...days.map(day=>({value:day,label:dateLabel(day,{weekday:'short',day:'numeric',month:'short'})}))]} placeholder={t('dash.filter.allDays')} searchPlaceholder={t('common.search')} emptyText={t('common.noResults')} /></div>
 </div>
}
