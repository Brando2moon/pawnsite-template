(()=>{
  'use strict';
  const C=window.PAWN_CONFIG||{};
  const client=(window.supabase&&C.supabaseUrl&&C.supabasePublishableKey)?window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey):null;
  const $=s=>document.querySelector(s);
  const money=value=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(Number(value||0));
  const escapeHtml=(value='')=>String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  let quotes=[];

  function badge(value){return `<span class="quote-badge ${escapeHtml(value)}">${escapeHtml(value.replaceAll('_',' '))}</span>`;}

  async function loadQuotes(){
    const body=$('[data-quotes]');
    if(!body||!client)return;
    const {data,error}=await client.from('kiosk_quotes').select('*').order('created_at',{ascending:false});
    if(error){body.innerHTML='<tr><td colspan="7">Unable to load kiosk quotes.</td></tr>';return;}
    quotes=data||[];
    body.innerHTML=quotes.length?quotes.map(q=>`
      <tr>
        <td><strong>${escapeHtml(q.quote_number)}</strong><small>${new Date(q.created_at).toLocaleString()}</small></td>
        <td>${escapeHtml(q.customer_name)}<small>${escapeHtml(q.phone)} · ${escapeHtml(q.email)}</small></td>
        <td>${escapeHtml(q.platform_name||q.platform)}</td>
        <td>${money(q.estimated_total)}</td>
        <td>${badge(q.compatibility_status)}</td>
        <td>${badge(q.status)}</td>
        <td><button class="table-action" type="button" data-review-quote="${q.id}">Review</button></td>
      </tr>`).join(''):'<tr><td colspan="7">No kiosk quotes have been submitted yet.</td></tr>';
    const pending=quotes.filter(q=>['submitted','staff_review'].includes(q.status)).length;
    const metric=$('[data-pending-quote-count]');if(metric)metric.textContent=String(pending);
  }

  function renderQuoteDetail(q){
    const detail=$('[data-quote-detail]');
    const items=Array.isArray(q.selected_parts)?q.selected_parts:[];
    detail.innerHTML=`
      <div class="quote-detail-head"><div><span class="eyebrow">${escapeHtml(q.quote_number)}</span><h3>${escapeHtml(q.customer_name)}</h3><p>${escapeHtml(q.phone)} · ${escapeHtml(q.email)}</p></div><button type="button" data-close-quote>Close</button></div>
      <div class="quote-line-items">${items.map(item=>`<div><span><small>${escapeHtml(item.item_type==='platform'?'Base platform':item.category||'Component')}</small><strong>${escapeHtml(item.name)}</strong><em>${escapeHtml(item.compatibility||'')}</em></span><b>${money(item.price)}</b></div>`).join('')}</div>
      <div class="quote-detail-total"><span>Customer estimate</span><strong>${money(q.estimated_total)}</strong></div>
      <div class="quote-customer-note"><strong>Customer notes</strong><p>${escapeHtml(q.customer_notes||q.notes||'No notes provided.')}</p></div>`;
    detail.hidden=false;
    const form=$('[data-quote-editor]');
    form.hidden=false;
    form.id.value=q.id;
    form.status.value=q.status;
    form.approved_total.value=q.approved_total??q.estimated_total??'';
    form.payment_status.value=q.payment_status||'counter_payment_pending';
    form.background_check_status.value=q.background_check_status||'not_started';
    form.background_check_reference.value=q.background_check_reference||'';
    form.staff_notes.value=q.staff_notes||'';
    detail.scrollIntoView({behavior:'smooth',block:'start'});
  }

  async function saveQuote(event){
    event.preventDefault();
    const form=event.currentTarget,status=$('[data-quote-editor-status]');
    const nextStatus=form.status.value;
    const row={
      status:nextStatus,
      approved_total:form.approved_total.value?Number(form.approved_total.value):null,
      payment_status:form.payment_status.value,
      background_check_status:form.background_check_status.value,
      background_check_reference:form.background_check_reference.value.trim()||null,
      staff_notes:form.staff_notes.value.trim()||null,
      reviewed_at:['approved','declined','cancelled','completed'].includes(nextStatus)?new Date().toISOString():null
    };
    const {data:{session}}=await client.auth.getSession();
    if(session)row.reviewed_by=session.user.id;
    const {error}=await client.from('kiosk_quotes').update(row).eq('id',form.id.value);
    status.textContent=error?error.message:'Quote status saved.';
    if(!error){await loadQuotes();const updated=quotes.find(q=>q.id===form.id.value);if(updated)renderQuoteDetail(updated);}
  }

  document.addEventListener('click',event=>{
    const review=event.target.closest('[data-review-quote]');
    if(review){const q=quotes.find(item=>item.id===review.dataset.reviewQuote);if(q)renderQuoteDetail(q);}
    if(event.target.closest('[data-close-quote]')){$('[data-quote-detail]').hidden=true;$('[data-quote-editor]').hidden=true;}
    if(event.target.closest('[data-refresh-quotes]'))loadQuotes();
  });

  document.addEventListener('DOMContentLoaded',()=>{
    $('[data-quote-editor]')?.addEventListener('submit',saveQuote);
    loadQuotes();
  });
})();
