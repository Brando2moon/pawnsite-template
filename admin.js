(()=>{
  'use strict';
  const C=window.PAWN_CONFIG||{};
  const client=(window.supabase&&C.supabaseUrl&&C.supabasePublishableKey)?window.supabase.createClient(C.supabaseUrl,C.supabasePublishableKey):null;
  const $=s=>document.querySelector(s);
  const escapeHtml=(value='')=>String(value).replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));

  async function requireStaff(){
    if(!client){location.href='admin-login.html';return false;}
    const {data:{session}}=await client.auth.getSession();
    if(!session){location.href='admin-login.html';return false;}
    const {data:profile,error}=await client.from('profiles').select('role').eq('id',session.user.id).maybeSingle();
    if(error||!profile||!['staff','owner','admin'].includes(profile.role)){
      await client.auth.signOut();
      location.href='admin-login.html';
      return false;
    }
    return true;
  }

  async function login(event){
    event.preventDefault();
    const form=event.currentTarget,status=$('[data-status]'),button=form.querySelector('button[type="submit"]');
    if(!client){status.textContent='Supabase is not configured.';return;}
    button.disabled=true;status.textContent='Signing in…';
    const {data,error}=await client.auth.signInWithPassword({email:form.email.value.trim(),password:form.password.value});
    if(error){button.disabled=false;status.textContent='Invalid email or password.';return;}
    const {data:profile}=await client.from('profiles').select('role').eq('id',data.user.id).maybeSingle();
    if(!profile||!['staff','owner','admin'].includes(profile.role)){
      await client.auth.signOut();button.disabled=false;status.textContent='This account does not have staff access.';return;
    }
    location.href='dashboard.html';
  }

  async function loadProducts(){
    if(!client)return;
    const {data,error}=await client.from('pawn_products').select('*').order('created_at',{ascending:false});
    const body=$('[data-admin-products]');
    if(!body)return;
    if(error){body.innerHTML='<tr><td colspan="4">Unable to load inventory.</td></tr>';return;}
    body.innerHTML=(data||[]).map(product=>`<tr><td>${escapeHtml(product.name)}</td><td>$${Number(product.price).toFixed(2)}</td><td>${escapeHtml(product.status)}</td><td><button class="table-action" type="button" data-edit-product='${JSON.stringify(product).replace(/'/g,'&#39;')}'>Edit</button></td></tr>`).join('')||'<tr><td colspan="4">No products yet.</td></tr>';
  }

  async function saveProduct(event){
    event.preventDefault();
    const form=event.currentTarget,status=$('[data-editor-status]'),submit=form.querySelector('button[type="submit"]');
    const row={name:form.name.value.trim(),category:form.category.value,price:Number(form.price.value),condition:form.condition.value.trim(),status:form.status.value,description:form.description.value.trim()};
    submit.disabled=true;status.textContent='Saving product…';
    const id=form.id.value;
    const result=id?await client.from('pawn_products').update(row).eq('id',id).select().single():await client.from('pawn_products').insert(row).select().single();
    if(result.error){submit.disabled=false;status.textContent=result.error.message;return;}
    const productId=result.data.id;
    const file=form.photo.files[0];
    if(file){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8388608){submit.disabled=false;status.textContent='Use a JPEG, PNG, or WebP image under 8 MB.';return;}
      const path=`${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
      const upload=await client.storage.from('product-images').upload(path,file);
      if(upload.error){submit.disabled=false;status.textContent='Product saved, but the photo upload failed.';await loadProducts();return;}
      const {data:url}=client.storage.from('product-images').getPublicUrl(path);
      await client.from('pawn_products').update({image_url:url.publicUrl}).eq('id',productId);
    }
    submit.disabled=false;status.textContent='Product saved.';form.reset();$('[data-preview]').removeAttribute('src');await loadProducts();
  }

  document.addEventListener('DOMContentLoaded',async()=>{
    const loginForm=$('[data-login]');
    if(loginForm){loginForm.addEventListener('submit',login);return;}
    if(!(await requireStaff()))return;
    $('[data-editor]')?.addEventListener('submit',saveProduct);
    $('[name=photo]')?.addEventListener('change',event=>{const file=event.target.files[0];if(file)$('[data-preview]').src=URL.createObjectURL(file);});
    $('[data-signout]')?.addEventListener('click',async()=>{await client.auth.signOut();location.href='admin-login.html';});
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-edit-product]');if(!button)return;
      const product=JSON.parse(button.dataset.editProduct),form=$('[data-editor]');
      for(const key of ['id','name','category','price','condition','status','description'])if(form[key])form[key].value=product[key]??'';
      $('[data-preview]').src=product.image_url||'';form.scrollIntoView({behavior:'smooth'});
    });
    await loadProducts();
  });
})();
