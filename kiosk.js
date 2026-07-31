(()=>{
  'use strict';
  const C=window.PAWN_CONFIG||{};
  const client=(window.supabase&&C.supabaseUrl&&C.supabasePublishableKey)
    ? window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey)
    : null;
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value||0));

  const state={catalog:[],platform:null,selected:new Set(),showAll:false,step:1,filter:'all'};

  window.KioskCatalogAdapter={
    mapManufacturerRecord(record){
      return {
        external_id:String(record.id||record.external_id||''),
        sku:String(record.sku||''),
        item_type:record.type==='platform'?'platform':'part',
        category:String(record.category||'Accessory'),
        manufacturer:String(record.manufacturer||''),
        model:String(record.model||''),
        name:String(record.name||record.title||''),
        description:String(record.description||''),
        price:Number(record.price||0),
        image_url:record.image_url||record.image||'',
        platform_key:record.platform_key||null,
        compatible_platforms:Array.isArray(record.compatible_platforms)?record.compatible_platforms:[],
        confirmed:record.confirmed!==false,
        availability:record.availability||'special_order',
        lead_time_text:record.lead_time_text||record.lead_time||'Ask staff',
        specs:record.specs||{}
      };
    }
  };

  function escapeHtml(value=''){
    return String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

  async function requireStaffSession(){
    if(!client){location.href='admin-login.html';return false;}
    const {data:{session}}=await client.auth.getSession();
    if(!session){location.href='admin-login.html';return false;}
    const {data:profile}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    if(!profile||!['staff','owner','admin'].includes(profile.role)){
      await client.auth.signOut();
      location.href='admin-login.html';
      return false;
    }
    return true;
  }

  async function loadCatalog(){
    const {data,error}=await client.from('kiosk_catalog').select('*').eq('active',true).order('sort_order').order('name');
    if(error)throw error;
    state.catalog=data||[];
  }

  function platformItems(){return state.catalog.filter(item=>item.item_type==='platform');}
  function partItems(){return state.catalog.filter(item=>item.item_type==='part');}
  function selectedItems(){
    const ids=new Set([state.platform?.id,...state.selected]);
    return state.catalog.filter(item=>ids.has(item.id));
  }
  function isConfirmed(item){return item.confirmed&&item.compatible_platforms?.includes(state.platform?.platform_key);}
  function compatibility_status(){
    return selectedItems().some(item=>item.item_type==='part'&&!isConfirmed(item))?'staff_review':'confirmed';
  }
  function estimatedTotal(){return selectedItems().reduce((sum,item)=>sum+Number(item.price||0),0);}

  function itemImage(item){
    const fallback=`https://placehold.co/900x600/0b1726/eaf2f8?text=${encodeURIComponent(item.name)}`;
    return `<img src="${escapeHtml(item.image_url||fallback)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.src='${fallback}'">`;
  }

  function renderPlatforms(){
    $('[data-platform-list]').innerHTML=platformItems().map(item=>`
      <button class="kiosk-product-card ${state.platform?.id===item.id?'selected':''}" type="button" data-platform-id="${item.id}">
        <span class="kiosk-card-media">${itemImage(item)}</span>
        <span class="kiosk-card-copy"><small>${escapeHtml(item.manufacturer||'Special order')}</small><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description||'')}</span></span>
        <span class="kiosk-card-foot"><b>${money(item.price)}</b><em>${escapeHtml(item.lead_time_text||'Ask staff')}</em></span>
      </button>`).join('')||'<p class="kiosk-empty">No platform templates are active. Ask staff to add catalog items in Supabase.</p>';
    $('[data-next="2"]').disabled=!state.platform;
  }

  function visibleParts(){
    if(!state.platform)return [];
    let items=partItems().filter(item=>state.showAll||isConfirmed(item));
    if(state.filter!=='all')items=items.filter(item=>item.category===state.filter);
    return items.sort((a,b)=>Number(isConfirmed(b))-Number(isConfirmed(a))||a.sort_order-b.sort_order||a.name.localeCompare(b.name));
  }

  function renderFilters(){
    const categories=[...new Set(partItems().map(item=>item.category))].sort();
    $('[data-part-filters]').innerHTML=['all',...categories].map(category=>`<button class="filter-chip ${state.filter===category?'active':''}" type="button" data-filter="${escapeHtml(category)}">${category==='all'?'All components':escapeHtml(category)}</button>`).join('');
  }

  function renderParts(){
    const items=visibleParts();
    $('[data-part-list]').innerHTML=items.map(item=>{
      const confirmed=isConfirmed(item);
      return `<label class="kiosk-product-card part-card ${state.selected.has(item.id)?'selected':''}">
        <input type="checkbox" data-part-id="${item.id}" ${state.selected.has(item.id)?'checked':''}>
        <span class="kiosk-card-media">${itemImage(item)}</span>
        <span class="kiosk-card-copy"><small>${escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.description||'')}</span></span>
        <span class="compatibility-tag ${confirmed?'confirmed':'verify'}">${confirmed?'Confirmed compatible':'Staff verification required'}</span>
        <span class="kiosk-card-foot"><b>${money(item.price)}</b><em>${escapeHtml(item.availability.replaceAll('_',' '))}</em></span>
      </label>`;
    }).join('')||'<p class="kiosk-empty">No matching components are available for this view.</p>';
    $('[data-warning]').hidden=!state.showAll;
  }

  function renderSummary(){
    const items=selectedItems();
    $('[data-build-summary]').innerHTML=items.map(item=>`
      <div class="summary-line">
        <div class="summary-thumb">${itemImage(item)}</div>
        <div><small>${item.item_type==='platform'?'Base platform':escapeHtml(item.category)}</small><strong>${escapeHtml(item.name)}</strong><span>${item.item_type==='part'?(isConfirmed(item)?'Confirmed compatible':'Staff verification required'):escapeHtml(item.manufacturer||'')}</span></div>
        <b>${money(item.price)}</b>
        ${item.item_type==='part'?`<button type="button" data-remove-part="${item.id}" aria-label="Remove ${escapeHtml(item.name)}">Remove</button>`:''}
      </div>`).join('');
    $('[data-estimated-total]').textContent=money(estimatedTotal());
    const pill=$('[data-compatibility-pill]');
    const review=compatibility_status()==='staff_review';
    pill.textContent=review?'Staff compatibility review required':'All selected components confirmed';
    pill.className=`compatibility-pill ${review?'review':''}`;
  }

  function setStep(step){
    state.step=step;
    $$('[data-step]').forEach(section=>section.hidden=Number(section.dataset.step)!==step);
    $$('[data-progress]').forEach(marker=>marker.classList.toggle('active',Number(marker.dataset.progress)<=step));
    if(step===2){renderFilters();renderParts();}
    if(step===3)renderSummary();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function resetBuild(){
    state.platform=null;state.selected.clear();state.showAll=false;state.filter='all';
    $('[data-show-all]').checked=false;
    $('[data-quote]').reset();
    $('[data-success]').hidden=true;
    $$('[data-step]').forEach(section=>section.hidden=true);
    $('[data-step="1"]').hidden=false;
    renderPlatforms();setStep(1);
  }

  async function submitQuote(event){
    event.preventDefault();
    const form=event.currentTarget;
    const status=$('[data-quote-status]');
    const submit=form.querySelector('button[type="submit"]');
    if(!state.platform){status.textContent='Choose a base platform before submitting.';return;}
    const parts=selectedItems().map(item=>({
      id:item.id,sku:item.sku,name:item.name,item_type:item.item_type,category:item.category,
      manufacturer:item.manufacturer,model:item.model,price:Number(item.price),
      compatibility:item.item_type==='platform'?'base':(isConfirmed(item)?'confirmed':'staff_review')
    }));
    const quote={
      customer_name:form.name.value.trim(),phone:form.phone.value.trim(),email:form.email.value.trim(),
      platform:state.platform.platform_key,platform_name:state.platform.name,selected_parts:parts,
      compatibility_status:compatibility_status(),estimated_total:estimatedTotal(),
      customer_notes:form.notes.value.trim()||null,notes:form.notes.value.trim()||null,status:'submitted'
    };
    submit.disabled=true;status.textContent='Submitting the build to staff…';
    const {data,error}=await client.from('kiosk_quotes').insert(quote).select('quote_number').single();
    submit.disabled=false;
    if(error){console.error(error);status.textContent='The quote could not be submitted. Return the tablet to staff and try again.';return;}
    $('[data-success-number]').textContent=data.quote_number;
    $$('[data-step]').forEach(section=>section.hidden=true);
    $('[data-success]').hidden=false;
    status.textContent='';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  document.addEventListener('click',event=>{
    const platform=event.target.closest('[data-platform-id]');
    if(platform){
      state.platform=state.catalog.find(item=>item.id===platform.dataset.platformId)||null;
      state.selected.clear();renderPlatforms();return;
    }
    const next=event.target.closest('[data-next]');if(next){setStep(Number(next.dataset.next));return;}
    const back=event.target.closest('[data-back]');if(back){setStep(Number(back.dataset.back));return;}
    const filter=event.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;renderFilters();renderParts();return;}
    const remove=event.target.closest('[data-remove-part]');if(remove){state.selected.delete(remove.dataset.removePart);renderSummary();return;}
    if(event.target.closest('[data-start-over]')){resetBuild();return;}
  });

  document.addEventListener('change',event=>{
    if(event.target.matches('[data-show-all]')){
      state.showAll=event.target.checked;
      if(!state.showAll){
        for(const id of [...state.selected]){
          const item=state.catalog.find(entry=>entry.id===id);
          if(item&&!isConfirmed(item))state.selected.delete(id);
        }
      }
      state.filter='all';renderFilters();renderParts();
    }
    if(event.target.matches('[data-part-id]')){
      event.target.checked?state.selected.add(event.target.dataset.partId):state.selected.delete(event.target.dataset.partId);
      event.target.closest('.part-card')?.classList.toggle('selected',event.target.checked);
    }
  });

  document.addEventListener('DOMContentLoaded',async()=>{
    $('[data-quote]').addEventListener('submit',submitQuote);
    $('[data-kiosk-exit]').addEventListener('click',async()=>{await client?.auth.signOut();location.href='admin-login.html';});
    try{
      if(!(await requireStaffSession()))return;
      await loadCatalog();
      renderPlatforms();
      $('[data-loading]').hidden=true;
    }catch(error){
      console.error(error);
      $('[data-loading]').innerHTML='<strong>Unable to load the kiosk catalog.</strong><span>Return to the admin dashboard and verify the Supabase setup.</span><a class="kiosk-btn primary" href="dashboard.html">Return to admin</a>';
    }
  });
})();
