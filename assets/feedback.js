// ToolsBravo feedback widget. Only feedback text is sent; tool inputs/files stay in-browser.
(() => {
  const mount = document.querySelector("[data-feedback-widget]");
  if (!mount) return;
  const slug = mount.dataset.feedbackWidget;
  if (!/^[a-z0-9-]{1,100}$/.test(slug)) return;
  const endpoint = "https://egypshduxktdyubwiaoo.supabase.co/functions/v1/submit-feedback";
  mount.innerHTML = '<section class="panel" aria-labelledby="feedback-heading"><h2 id="feedback-heading">Help improve this tool</h2><p>Share a review, report a problem or suggest an improvement. Please do not include personal or financial information.</p><form id="tool-feedback-form"><label for="feedback-category">Feedback type</label><select id="feedback-category" required><option value="review">Review</option><option value="bug">Report a problem</option><option value="feature">Suggest a feature</option><option value="other">Other feedback</option></select><label for="feedback-rating">Rating (required for reviews)</label><select id="feedback-rating"><option value="">No rating</option><option value="5">5 — Excellent</option><option value="4">4 — Good</option><option value="3">3 — Average</option><option value="2">2 — Poor</option><option value="1">1 — Very poor</option></select><label for="feedback-message">Your feedback</label><textarea id="feedback-message" maxlength="2000" minlength="5" required placeholder="What worked or what could be better?"></textarea><div hidden aria-hidden="true"><label for="feedback-website">Leave this empty</label><input id="feedback-website" autocomplete="off" tabindex="-1"></div><p><button type="submit" class="primary">Send feedback</button></p><p id="feedback-status" role="status" aria-live="polite"></p></form><p class="muted">Feedback is stored securely for moderation. Reviews are not published automatically.</p></section>';
  const form = mount.querySelector("form"), cat=mount.querySelector("#feedback-category"), rating=mount.querySelector("#feedback-rating"), status=mount.querySelector("#feedback-status"), button=form.querySelector("button");
  const sync=()=>{rating.required=cat.value==="review";};
  cat.addEventListener("change",sync);sync();
  form.addEventListener("submit",async e=>{
    e.preventDefault(); if(!form.reportValidity())return;
    button.disabled=true;status.textContent="Sending…";
    const payload={tool_slug:slug,category:cat.value,rating:rating.value?Number(rating.value):null,message:mount.querySelector("#feedback-message").value.trim(),website:mount.querySelector("#feedback-website").value};
    try{
      const response=await fetch(endpoint,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok||!data.ok)throw new Error(data.error||"Submission failed");
      form.reset();sync();status.textContent="Thank you. Your feedback has been received for review.";
    }catch(err){status.textContent=err.message||"Could not send feedback. Please try again.";}
    finally{button.disabled=false;}
  });
})();
