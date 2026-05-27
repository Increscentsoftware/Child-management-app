// src/pages/AddChildPage.tsx — Tabbed form, Submit only on last tab
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { saveChildLocally } from '@/lib/db'
import { useAppStore } from '@/lib/store'
import { supabase } from '@/lib/supabase'
import type { Child, ChildType } from '@/types'
import { ArrowLeft, Camera, Loader2, Check, X, ChevronRight, ChevronLeft } from 'lucide-react'

const G = '#1a6b4a'
const inp: React.CSSProperties = { width:'100%', padding:'9px 11px', border:'1px solid #e0e0e0', borderRadius:8, fontSize:13, fontFamily:'inherit', outline:'none', background:'#fff', boxSizing:'border-box', color:'#111' }
const sel: React.CSSProperties = { ...inp, cursor:'pointer' }
const ta:  React.CSSProperties = { ...inp, minHeight:64, resize:'vertical' as const }
const g2:  React.CSSProperties = { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }

function F({ label, req, children, hint }: { label:string; req?:boolean; children:React.ReactNode; hint?:string }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:11, color:'#666', display:'block', marginBottom:4, fontWeight:req?600:400 }}>
        {label}{req && <span style={{ color:'#e24b4a' }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize:10, color:'#999', marginTop:3 }}>{hint}</div>}
    </div>
  )
}

function Sec({ title }: { title:string }) {
  return <div style={{ fontSize:10, fontWeight:700, color:G, background:'#e8f5e9', padding:'5px 10px', borderRadius:8, margin:'16px 0 10px', textTransform:'uppercase' as const, letterSpacing:'0.06em' }}>{title}</div>
}

const TABS = ['Identity','Father','Mother','Siblings','Financial','Living','Child Profile','Documents']

function Stepper({ tab, setTab }: { tab:number; setTab:(n:number)=>void }) {
  return (
    <div style={{ overflowX:'auto', display:'flex', alignItems:'center', padding:'10px 14px', background:'#f5f5f5', borderBottom:'1px solid #e5e5e5', gap:2, scrollbarWidth:'none' as const }}>
      {TABS.map((t,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', flexShrink:0 }}>
          <button onClick={()=>setTab(i)} style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 6px', background:i===tab?'#fff':'transparent', border:i===tab?`1px solid ${G}`:'1px solid transparent', borderRadius:7, cursor:'pointer', fontFamily:'inherit' }}>
            <div style={{ width:20, height:20, borderRadius:'50%', fontSize:10, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:i<tab?G:i===tab?G:'#ddd', color:i<=tab?'#fff':'#999' }}>
              {i<tab?<Check size={10}/>:i+1}
            </div>
            <span style={{ fontSize:11, fontWeight:i===tab?600:400, color:i===tab?G:i<tab?'#555':'#aaa', whiteSpace:'nowrap' as const }}>{t}</span>
          </button>
          {i<TABS.length-1 && <span style={{ color:'#ddd', fontSize:10, margin:'0 1px' }}>›</span>}
        </div>
      ))}
    </div>
  )
}

const DOC_TYPES = [
  { type:'photo',             label:'Child Photo',       accept:'image/*',      icon:'📷' },
  { type:'aadhar',            label:'Aadhar Card',       accept:'image/*,.pdf', icon:'🪪' },
  { type:'birth_certificate', label:'Birth Certificate', accept:'image/*,.pdf', icon:'📄' },
  { type:'certificate',       label:'Certificate',       accept:'image/*,.pdf', icon:'🏆' },
  { type:'progress_card',     label:'Progress Card',     accept:'image/*,.pdf', icon:'📊' },
  { type:'other',             label:'Other Document',    accept:'*',            icon:'📎' },
] as const

function DocUpload({ childId, onPhotoUrl }: { childId:string|null; onPhotoUrl:(url:string)=>void }) {
  const [uploading, setUploading] = useState<string|null>(null)
  const [done, setDone] = useState<Record<string,string>>({})
  async function upload(type:string, file:File) {
    if (!childId) { toast.error('Save the record first to upload documents'); return }
    setUploading(type)
    try {
      const ext = file.name.split('.').pop()
      const path = `children/${childId}/${type}/${Date.now()}.${ext}`
      const { error:upErr } = await supabase.storage.from('child-documents').upload(path, file, { upsert:true })
      if (upErr) throw upErr
      const { data:u } = supabase.storage.from('child-documents').getPublicUrl(path)
      await supabase.from('documents').insert({ id:crypto.randomUUID(), child_id:childId, doc_type:type, file_name:file.name, storage_path:path, public_url:u.publicUrl, file_size_kb:Math.round(file.size/1024), uploaded_at:new Date().toISOString() })
      if (type==='photo') onPhotoUrl(u.publicUrl)
      setDone(p=>({...p,[type]:file.name}))
      toast.success(`${file.name} uploaded`)
    } catch(err) { toast.error('Upload failed: '+String(err)) }
    finally { setUploading(null) }
  }
  if (!childId) return <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#92400e' }}>⚠ Save the record first by clicking "Save &amp; Continue" on previous tabs, then come back here to upload documents.</div>
  return (
    <div style={{ display:'flex', flexWrap:'wrap' as const, gap:8 }}>
      {DOC_TYPES.map(({ type, label, accept, icon }) => {
        const isDone = !!done[type], isBusy = uploading===type
        return (
          <label key={type} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', border:`1.5px solid ${isDone?G:'#ddd'}`, borderRadius:20, background:isDone?'#e8f5e9':'#fafafa', cursor:isBusy?'not-allowed':'pointer', fontSize:12, fontWeight:500, color:isDone?G:'#555' }}>
            <span style={{ fontSize:15 }}>{isBusy?'⏳':isDone?'✅':icon}</span>
            {isBusy?'Uploading…':isDone?(done[type].length>20?done[type].slice(0,18)+'…':done[type]):label}
            <input type="file" accept={accept} style={{ display:'none' }} disabled={isBusy} onChange={e=>{const f=e.target.files?.[0];if(f)upload(type,f);e.target.value=''}} />
          </label>
        )
      })}
    </div>
  )
}

export default function AddChildPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?:string }>()
  const { user } = useAppStore()
  const isEdit = !!id
  const [tab, setTab] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savedChildId, setSavedChildId] = useState<string|null>(id||null)
  const [photo, setPhoto] = useState<File|null>(null)
  const [photoPreview, setPhotoPreview] = useState<string|null>(null)
  const [childType, setChildType] = useState<ChildType>('shishu_student')
  const [siblings, setSiblings] = useState<{name:string;age:string;sex:string;education:string}[]>([])
  const [d, setD] = useState<Record<string,unknown>>({ father_status:'Unknown', mother_status:'Unknown', father_dv:false, lifecycle_status:'active' })

  useEffect(() => {
    if (!id) return
    supabase.from('children').select('*').eq('id',id).single().then(({data})=>{ if(data){ setD(data); setChildType(data.child_type||'shishu_student'); if(data.photo_url) setPhotoPreview(data.photo_url) } })
    supabase.from('siblings').select('*').eq('child_id',id).then(({data})=>{ if(data) setSiblings(data.map((s:any)=>({name:s.name||'',age:s.age||'',sex:s.sex||'',education:s.education||''}))) })
  },[id])

  const set = (k:string,v:unknown) => setD(p=>({...p,[k]:v}))
  const str = (k:string) => String(d[k]||'')

  async function saveRecord() {
    if (!String(d.full_name||'').trim()) { toast.error('Child name is required'); setTab(0); return false }
    setSaving(true)
    try {
      const childId = savedChildId || crypto.randomUUID()
      let photoUrl = d.photo_url as string|undefined
      if (photo) {
        const ext = photo.name.split('.').pop()
        const path = `children/${childId}/photo/profile.${ext}`
        const { error } = await supabase.storage.from('child-documents').upload(path, photo, { upsert:true })
        if (!error) { const { data:u } = supabase.storage.from('child-documents').getPublicUrl(path); photoUrl = u.publicUrl }
        else { toast.error('Photo upload failed: ' + error.message) }
      }
      const child = { id:childId, child_type:childType, lifecycle_status:str('lifecycle_status')||'active', school_id:str('school_id')||`SM-${Date.now()}`, full_name:str('full_name'), admission_date:d.admission_date||null, date_of_birth:d.date_of_birth||null, sex:d.sex||null, religion:str('religion'), mother_tongue:str('mother_tongue'), present_class:str('present_class'), category:d.category||null, aadhar_no:str('aadhar_no'), normal_or_special:str('normal_or_special')||'Normal', photo_url:photoUrl||null, father_name:str('father_name'), father_age:str('father_age'), father_aadhar:str('father_aadhar'), father_mobile:str('father_mobile'), father_status:str('father_status')||'Unknown', father_occupation:str('father_occupation'), father_nature_of_work:str('father_nature_of_work'), father_earnings:str('father_earnings'), father_education:str('father_education'), father_habits:str('father_habits'), father_health:str('father_health'), father_dv:d.father_dv===true, father_extramarital:d.father_extramarital===true, father_origin:str('father_origin'), mother_name:str('mother_name'), mother_age:str('mother_age'), mother_aadhar:str('mother_aadhar'), mother_mobile:str('mother_mobile'), mother_status:str('mother_status')||'Unknown', mother_occupation:str('mother_occupation'), mother_nature_of_work:str('mother_nature_of_work'), mother_earnings:str('mother_earnings'), mother_education:str('mother_education'), mother_habits:str('mother_habits'), mother_health:str('mother_health'), mother_dv:d.mother_dv===true, family_planning_op:d.family_planning_op===true, mother_origin:str('mother_origin'), year_of_marriage:str('year_of_marriage'), marriage_type:str('marriage_type'), avg_monthly_income:str('avg_monthly_income'), other_income:str('other_income'), govt_support:str('govt_support'), num_dependents:str('num_dependents'), debts:str('debts'), savings:str('savings'), area_type:str('area_type'), house_size:str('house_size'), house_roof:str('house_roof'), house_floor:str('house_floor'), house_ownership:str('house_ownership'), house_condition:str('house_condition'), kitchen_type:str('kitchen_type'), bathing_place:str('bathing_place'), rent_per_month:str('rent_per_month'), advance_paid:str('advance_paid'), sanitation:str('sanitation'), water_source:str('water_source'), height_cm:str('height_cm'), weight_kg:str('weight_kg'), child_health:str('child_health'), meals_per_day:str('meals_per_day'), food_type:str('food_type'), medical_help_from:str('medical_help_from'), relationship_father:str('relationship_father'), relationship_mother:str('relationship_mother'), relationship_siblings:str('relationship_siblings'), interests:str('interests'), preschool:str('preschool'), special_remarks:str('special_remarks'), conclusion:str('conclusion'), reported_by:str('reported_by'), verified_by:str('verified_by'), address_line1:str('address_line1'), contact_phone:str('contact_phone'), is_active:true, created_by:user?.id, created_at:(d.created_at as string)||new Date().toISOString(), updated_at:new Date().toISOString() }
      if (isEdit||savedChildId) { const { error } = await supabase.from('children').update({...child,updated_at:new Date().toISOString()}).eq('id',childId); if(error) throw error; await saveChildLocally(child as unknown as Child) }
      else { const { error } = await supabase.from('children').insert(child); if(error) throw error; await saveChildLocally(child as unknown as Child) }
      await supabase.from('siblings').delete().eq('child_id',childId)
      for (const sib of siblings) { if(!sib.name.trim()) continue; await supabase.from('siblings').insert({ id:crypto.randomUUID(), child_id:childId, name:sib.name, age:sib.age, sex:sib.sex, education:sib.education, is_also_sm_student:false, created_at:new Date().toISOString() }) }
      setSavedChildId(childId); return true
    } catch(err:any) { toast.error(err.message||'Save failed'); return false }
    finally { setSaving(false) }
  }

  async function handleNext() {
    const ok = await saveRecord()
    if (!ok) return
    if (tab < TABS.length-1) { toast.success('Saved ✓'); setTab(t=>t+1) }
    else { toast.success(isEdit?'Record updated!':'Child record saved!'); navigate(`/children/${savedChildId}`) }
  }

  const isLast = tab === TABS.length-1

  function Bar() {
    return (
      <div style={{ display:'flex', gap:10, marginTop:28, paddingBottom:20 }}>
        {tab>0 && <button type="button" onClick={()=>setTab(t=>t-1)} style={{ padding:'12px 18px', background:'#f0f0f0', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:5 }}><ChevronLeft size={15}/> Back</button>}
        {!isLast && <button type="button" onClick={handleNext} disabled={saving} style={{ flex:1, padding:'12px', background:saving?'#5dcaa5':G, color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>{saving&&<Loader2 size={15} style={{animation:'spin 1s linear infinite'}}/>}{saving?'Saving…':'Save & Continue →'}</button>}
        {!isLast && <button type="button" onClick={()=>setTab(t=>t+1)} style={{ padding:'12px 14px', background:'#e8f5e9', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', color:G, fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>Skip <ChevronRight size={14}/></button>}
        {isLast && <button type="button" onClick={handleNext} disabled={saving} style={{ flex:1, padding:'13px', background:saving?'#5dcaa5':G, color:'#fff', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:saving?'not-allowed':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>{saving?<Loader2 size={16} style={{animation:'spin 1s linear infinite'}}/>:<Check size={16}/>}{saving?'Saving…':isEdit?'✓ Update Child Record':'✓ Submit — Save Record'}</button>}
      </div>
    )
  }

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <div style={{ background:G, color:'#fff', padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={()=>navigate('/children')} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:2 }}><ArrowLeft size={20}/></button>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600, fontSize:15 }}>{isEdit?'Edit Child Record':'Add New Child'}</div>
          <div style={{ fontSize:11, opacity:.75 }}>{str('full_name')||'New record'}</div>
        </div>
        <select value={childType} onChange={e=>setChildType(e.target.value as ChildType)} style={{ background:'rgba(255,255,255,.15)', border:'1px solid rgba(255,255,255,.3)', color:'#fff', padding:'4px 8px', borderRadius:6, fontSize:11, fontFamily:'inherit' }}>
          <option value="shishu_student">Shishu Student</option>
          <option value="sponsored_external">Sponsored External</option>
          <option value="alumni">Alumni</option>
        </select>
      </div>

      <Stepper tab={tab} setTab={setTab}/>

      <div style={{ padding:'14px 16px' }}>

        {tab===0 && <>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', marginBottom:18 }}>
            <div style={{ width:80, height:80, borderRadius:'50%', overflow:'hidden', background:'#e8f5e9', border:`2px solid ${G}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8, cursor:'pointer' }} onClick={()=>document.getElementById('photo-inp')?.click()}>
              {photoPreview?<img src={photoPreview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>:<Camera size={28} color={G}/>}
            </div>
            <label style={{ fontSize:11, color:G, fontWeight:600, cursor:'pointer', padding:'4px 14px', border:`1px solid ${G}`, borderRadius:16 }}>
              {photo?photo.name.slice(0,22):'Upload Photo'}
              <input id="photo-inp" type="file" accept="image/*" style={{ display:'none' }} onChange={e=>{const f=e.target.files?.[0];if(f){setPhoto(f);setPhotoPreview(URL.createObjectURL(f))}}}/>
            </label>
          </div>
          <div style={g2}>
            <F label="School ID / Adm No." req><input style={inp} value={str('school_id')} onChange={e=>set('school_id',e.target.value)} placeholder="e.g. 613"/></F>
            <F label="Admission Date"><input type="date" style={inp} value={str('admission_date')} onChange={e=>set('admission_date',e.target.value)}/></F>
          </div>
          <F label="Full Name of Child" req><input style={inp} value={str('full_name')} onChange={e=>set('full_name',e.target.value)} placeholder="Child's full name"/></F>
          <div style={g2}>
            <F label="Date of Birth"><input type="date" style={inp} value={str('date_of_birth')} onChange={e=>set('date_of_birth',e.target.value)}/></F>
            <F label="Sex"><select style={sel} value={str('sex')} onChange={e=>set('sex',e.target.value)}><option value="">— select —</option><option>Male</option><option>Female</option><option>Other</option></select></F>
          </div>
          <div style={g2}>
            <F label="Religion"><input style={inp} value={str('religion')} onChange={e=>set('religion',e.target.value)} placeholder="e.g. Hindu"/></F>
            <F label="Mother Tongue"><input style={inp} value={str('mother_tongue')} onChange={e=>set('mother_tongue',e.target.value)} placeholder="e.g. Kannada"/></F>
          </div>
          <div style={g2}>
            <F label="Present Class"><input style={inp} value={str('present_class')} onChange={e=>set('present_class',e.target.value)} placeholder="e.g. 1A"/></F>
            <F label="Category"><select style={sel} value={str('category')} onChange={e=>set('category',e.target.value)}><option value="">— select —</option><option>Category I</option><option>Category II</option><option>Category III</option><option>Category IV</option></select></F>
          </div>
          <div style={g2}>
            <F label="Aadhar No."><input style={inp} value={str('aadhar_no')} onChange={e=>set('aadhar_no',e.target.value)}/></F>
            <F label="Normal / Special"><select style={sel} value={str('normal_or_special')||'Normal'} onChange={e=>set('normal_or_special',e.target.value)}><option>Normal</option><option>Special</option></select></F>
          </div>
          <Bar/>
        </>}

        {tab===1 && <>
          <div style={g2}>
            <F label="Father's Name"><input style={inp} value={str('father_name')} onChange={e=>set('father_name',e.target.value)}/></F>
            <F label="Age"><input style={inp} value={str('father_age')} onChange={e=>set('father_age',e.target.value)} placeholder="e.g. 35 years"/></F>
          </div>
          <div style={g2}>
            <F label="Status"><select style={sel} value={str('father_status')||'Unknown'} onChange={e=>set('father_status',e.target.value)}><option>Alive</option><option>Dead</option><option>Abandoned</option><option>Unknown</option></select></F>
            <F label="Education"><input style={inp} value={str('father_education')} onChange={e=>set('father_education',e.target.value)} placeholder="e.g. 12th Std"/></F>
          </div>
          <div style={g2}>
            <F label="Occupation"><input style={inp} value={str('father_occupation')} onChange={e=>set('father_occupation',e.target.value)} placeholder="e.g. Painter"/></F>
            <F label="Nature of Work"><input style={inp} value={str('father_nature_of_work')} onChange={e=>set('father_nature_of_work',e.target.value)} placeholder="e.g. Painting"/></F>
          </div>
          <div style={g2}>
            <F label="Earnings"><input style={inp} value={str('father_earnings')} onChange={e=>set('father_earnings',e.target.value)} placeholder="e.g. Rs.500/day"/></F>
            <F label="Health"><input style={inp} value={str('father_health')} onChange={e=>set('father_health',e.target.value)} placeholder="e.g. Normal"/></F>
          </div>
          <F label="Habits"><input style={inp} value={str('father_habits')} onChange={e=>set('father_habits',e.target.value)} placeholder="e.g. Drinking and smoking"/></F>
          <F label="Place of Origin"><input style={inp} value={str('father_origin')} onChange={e=>set('father_origin',e.target.value)} placeholder="e.g. Andhra Pradesh"/></F>
          <div style={g2}>
            <F label="Aadhar No."><input style={inp} value={str('father_aadhar')} onChange={e=>set('father_aadhar',e.target.value)}/></F>
            <F label="Mobile"><input type="tel" style={inp} value={str('father_mobile')} onChange={e=>set('father_mobile',e.target.value)}/></F>
          </div>
          <div style={{ display:'flex', gap:24, marginBottom:12, flexWrap:'wrap' as const }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}><input type="checkbox" checked={!!d.father_dv} onChange={e=>set('father_dv',e.target.checked)}/> Domestic Violence (DV)</label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}><input type="checkbox" checked={!!d.father_extramarital} onChange={e=>set('father_extramarital',e.target.checked)}/> Extramarital Relationship</label>
          </div>
          <Bar/>
        </>}

        {tab===2 && <>
          <div style={g2}>
            <F label="Mother's Name"><input style={inp} value={str('mother_name')} onChange={e=>set('mother_name',e.target.value)}/></F>
            <F label="Age"><input style={inp} value={str('mother_age')} onChange={e=>set('mother_age',e.target.value)}/></F>
          </div>
          <div style={g2}>
            <F label="Status"><select style={sel} value={str('mother_status')||'Unknown'} onChange={e=>set('mother_status',e.target.value)}><option>Alive</option><option>Dead</option><option>Abandoned</option><option>Unknown</option></select></F>
            <F label="Education"><input style={inp} value={str('mother_education')} onChange={e=>set('mother_education',e.target.value)}/></F>
          </div>
          <div style={g2}>
            <F label="Occupation"><input style={inp} value={str('mother_occupation')} onChange={e=>set('mother_occupation',e.target.value)} placeholder="e.g. Housewife"/></F>
            <F label="Earnings"><input style={inp} value={str('mother_earnings')} onChange={e=>set('mother_earnings',e.target.value)}/></F>
          </div>
          <div style={g2}>
            <F label="Health"><input style={inp} value={str('mother_health')} onChange={e=>set('mother_health',e.target.value)}/></F>
            <F label="Place of Origin"><input style={inp} value={str('mother_origin')} onChange={e=>set('mother_origin',e.target.value)}/></F>
          </div>
          <F label="Mobile"><input type="tel" style={inp} value={str('mother_mobile')} onChange={e=>set('mother_mobile',e.target.value)}/></F>
          <div style={{ display:'flex', gap:24, marginBottom:12, flexWrap:'wrap' as const }}>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}><input type="checkbox" checked={!!d.mother_dv} onChange={e=>set('mother_dv',e.target.checked)}/> Domestic Violence (DV)</label>
            <label style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, cursor:'pointer' }}><input type="checkbox" checked={!!d.family_planning_op} onChange={e=>set('family_planning_op',e.target.checked)}/> Family Planning Operation Done</label>
          </div>
          <Bar/>
        </>}

        {tab===3 && <>
          {siblings.length===0 && <div style={{ textAlign:'center', padding:'20px 0', color:'#bbb', fontSize:13 }}>No siblings added yet</div>}
          {siblings.map((sib,i) => (
            <div key={i} style={{ background:'#f9f9f9', borderRadius:10, padding:12, marginBottom:10, position:'relative' }}>
              <button type="button" onClick={()=>setSiblings(p=>p.filter((_,j)=>j!==i))} style={{ position:'absolute', top:8, right:8, background:'none', border:'none', cursor:'pointer', color:'#e24b4a' }}><X size={14}/></button>
              <div style={{ fontSize:11, fontWeight:600, color:G, marginBottom:8 }}>Sibling {i+1}</div>
              <div style={g2}>
                <F label="Name"><input style={inp} value={sib.name} onChange={e=>setSiblings(p=>p.map((s,j)=>j===i?{...s,name:e.target.value}:s))}/></F>
                <F label="Age"><input style={inp} value={sib.age} onChange={e=>setSiblings(p=>p.map((s,j)=>j===i?{...s,age:e.target.value}:s))}/></F>
              </div>
              <div style={g2}>
                <F label="Sex"><select style={sel} value={sib.sex} onChange={e=>setSiblings(p=>p.map((s,j)=>j===i?{...s,sex:e.target.value}:s))}><option value="">—</option><option>Male</option><option>Female</option></select></F>
                <F label="Education"><input style={inp} value={sib.education} onChange={e=>setSiblings(p=>p.map((s,j)=>j===i?{...s,education:e.target.value}:s))}/></F>
              </div>
            </div>
          ))}
          <button type="button" onClick={()=>setSiblings(p=>[...p,{name:'',age:'',sex:'',education:''}])} style={{ width:'100%', padding:'9px', background:'none', border:`1.5px dashed ${G}`, borderRadius:9, color:G, fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit', marginBottom:4 }}>+ Add Sibling</button>
          <Bar/>
        </>}

        {tab===4 && <>
          <Sec title="Family Background"/>
          <div style={g2}>
            <F label="Year of Marriage"><input style={inp} value={str('year_of_marriage')} onChange={e=>set('year_of_marriage',e.target.value)} placeholder="e.g. 2015"/></F>
            <F label="Type of Marriage"><select style={sel} value={str('marriage_type')} onChange={e=>set('marriage_type',e.target.value)}><option value="">— select —</option><option>Arranged</option><option>Love</option></select></F>
          </div>
          <Sec title="Income & Finances"/>
          <F label="Average Monthly Income (Family)"><input style={inp} value={str('avg_monthly_income')} onChange={e=>set('avg_monthly_income',e.target.value)} placeholder="e.g. Rs.10,000/month"/></F>
          <div style={g2}>
            <F label="Other Income"><input style={inp} value={str('other_income')} onChange={e=>set('other_income',e.target.value)}/></F>
            <F label="Govt / NGO Support"><input style={inp} value={str('govt_support')} onChange={e=>set('govt_support',e.target.value)}/></F>
          </div>
          <div style={g2}>
            <F label="No. of Dependents"><input style={inp} value={str('num_dependents')} onChange={e=>set('num_dependents',e.target.value)} placeholder="e.g. 4"/></F>
            <F label="Savings / PF"><input style={inp} value={str('savings')} onChange={e=>set('savings',e.target.value)}/></F>
          </div>
          <F label="Debts (with reason)"><textarea style={ta} value={str('debts')} onChange={e=>set('debts',e.target.value)}/></F>
          <Bar/>
        </>}

        {tab===5 && <>
          <div style={g2}>
            <F label="Area Type"><select style={sel} value={str('area_type')} onChange={e=>set('area_type',e.target.value)}><option value="">— select —</option><option>Slum</option><option>Village</option><option>Urban</option></select></F>
            <F label="House Size / No. of Rooms"><input style={inp} value={str('house_size')} onChange={e=>set('house_size',e.target.value)} placeholder="e.g. 10x15, 1 room"/></F>
          </div>
          <div style={g2}>
            <F label="Roof Type"><input style={inp} value={str('house_roof')} onChange={e=>set('house_roof',e.target.value)} placeholder="e.g. RCC / Sheet"/></F>
            <F label="Flooring"><input style={inp} value={str('house_floor')} onChange={e=>set('house_floor',e.target.value)} placeholder="e.g. Tiles / Cement"/></F>
          </div>
          <div style={g2}>
            <F label="House Ownership"><select style={sel} value={str('house_ownership')} onChange={e=>set('house_ownership',e.target.value)}><option value="">— select —</option><option>Owned</option><option>Rented</option><option>Govt Given</option><option>Inherited</option></select></F>
            <F label="Rent per Month"><input style={inp} value={str('rent_per_month')} onChange={e=>set('rent_per_month',e.target.value)} placeholder="e.g. Rs.4000"/></F>
          </div>
          <div style={g2}>
            <F label="Sanitation"><input style={inp} value={str('sanitation')} onChange={e=>set('sanitation',e.target.value)}/></F>
            <F label="Water Source"><input style={inp} value={str('water_source')} onChange={e=>set('water_source',e.target.value)}/></F>
          </div>
          <F label="House Condition"><input style={inp} value={str('house_condition')} onChange={e=>set('house_condition',e.target.value)}/></F>
          <div style={g2}>
            <F label="Kitchen"><input style={inp} value={str('kitchen_type')} onChange={e=>set('kitchen_type',e.target.value)}/></F>
            <F label="Bathing Place"><input style={inp} value={str('bathing_place')} onChange={e=>set('bathing_place',e.target.value)}/></F>
          </div>
          <Bar/>
        </>}

        {tab===6 && <>
          <Sec title="Health & Physical"/>
          <div style={g2}>
            <F label="Height (cm)"><input type="number" style={inp} value={str('height_cm')} onChange={e=>set('height_cm',e.target.value)}/></F>
            <F label="Weight (kg)"><input type="number" style={inp} value={str('weight_kg')} onChange={e=>set('weight_kg',e.target.value)}/></F>
          </div>
          <F label="Health Issues / Conditions"><textarea style={ta} value={str('child_health')} onChange={e=>set('child_health',e.target.value)}/></F>
          <div style={g2}>
            <F label="Meals per Day"><input style={inp} value={str('meals_per_day')} onChange={e=>set('meals_per_day',e.target.value)} placeholder="e.g. 3 times"/></F>
            <F label="Type of Food"><input style={inp} value={str('food_type')} onChange={e=>set('food_type',e.target.value)}/></F>
          </div>
          <F label="Medical Help From"><input style={inp} value={str('medical_help_from')} onChange={e=>set('medical_help_from',e.target.value)}/></F>
          <Sec title="Relationships & Interests"/>
          <div style={g2}>
            <F label="Relationship with Father"><input style={inp} value={str('relationship_father')} onChange={e=>set('relationship_father',e.target.value)}/></F>
            <F label="Relationship with Mother"><input style={inp} value={str('relationship_mother')} onChange={e=>set('relationship_mother',e.target.value)}/></F>
          </div>
          <F label="Interests / Leisure"><input style={inp} value={str('interests')} onChange={e=>set('interests',e.target.value)}/></F>
          <F label="Preschool Care"><input style={inp} value={str('preschool')} onChange={e=>set('preschool',e.target.value)}/></F>
          <Sec title="Social Worker Remarks"/>
          <F label="Special Remarks"><textarea style={ta} value={str('special_remarks')} onChange={e=>set('special_remarks',e.target.value)}/></F>
          <F label="Conclusion / Overall Assessment" hint="Social worker's narrative"><textarea style={{ ...ta, minHeight:90 }} value={str('conclusion')} onChange={e=>set('conclusion',e.target.value)}/></F>
          <div style={g2}>
            <F label="Reported By"><input style={inp} value={str('reported_by')} onChange={e=>set('reported_by',e.target.value)}/></F>
            <F label="Verified By"><input style={inp} value={str('verified_by')} onChange={e=>set('verified_by',e.target.value)}/></F>
          </div>
          <div style={g2}>
            <F label="Address"><input style={inp} value={str('address_line1')} onChange={e=>set('address_line1',e.target.value)}/></F>
            <F label="Phone"><input type="tel" style={inp} value={str('contact_phone')} onChange={e=>set('contact_phone',e.target.value)}/></F>
          </div>
          <Bar/>
        </>}

        {tab===7 && <>
          <div style={{ background:'#e8f5e9', borderRadius:10, padding:'10px 14px', marginBottom:14, fontSize:12, color:'#2e7d32' }}>
            Upload documents for this child. More documents can be added anytime from the child's profile.
          </div>
          <DocUpload childId={savedChildId} onPhotoUrl={(url)=>{ set('photo_url',url); setPhotoPreview(url) }}/>
          <Bar/>
        </>}

      </div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}