// Content script to capture auth info from the callback page
(function() {
  console.log('[LovableAuto] Auth callback detector active');
  
  try {
    // Try to parse the body as JSON
    const bodyText = document.body.innerText;
    const authData = JSON.parse(bodyText);
    
    if (authData.token && authData.user) {
      console.log('[LovableAuto] Auth data found, sending to background...');
      
      chrome.runtime.sendMessage({
        type: 'AUTH_CALLBACK',
        token: authData.token,
        user: authData.user
      });

      // Show a success message to the user
      document.body.innerHTML = `
        <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: white;">
          <div style="background: #1e293b; padding: 2rem; border-radius: 1rem; text-align: center; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);">
            <div style="font-size: 3rem; margin-bottom: 1rem;">⚡</div>
            <h1 style="margin: 0 0 0.5rem 0;">Autenticado com sucesso!</h1>
            <p style="color: #94a3b8; margin-bottom: 1.5rem;">Você já pode fechar esta aba e voltar para a barra lateral.</p>
            <button onclick="window.close()" style="background: #3b82f6; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; font-weight: bold; cursor: pointer;">Fechar Aba</button>
          </div>
        </div>
      `;
    }
  } catch (e) {
    console.log('[LovableAuto] Not a JSON response or auth data missing');
  }
})();
