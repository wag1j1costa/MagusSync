document.addEventListener('DOMContentLoaded', function() {
    const saveButton = document.getElementById('save-button');

    // Carrega os valores salvos, se existirem
    const savedApiKey = localStorage.getItem('api_key');
    const savedSellerId = localStorage.getItem('seller_id');
    if (savedApiKey) {
        document.getElementById('api-key-input').value = savedApiKey;
    }
    if (savedSellerId) {
        document.getElementById('seller-id-input').value = savedSellerId;
    }

    // Envia uma mensagem para o content.js com os valores salvos
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {apiKey: savedApiKey, sellerId: savedSellerId}, function(response) {
            
        });
    })

    saveButton.addEventListener('click', function() {
        // Obtém os valores dos inputs
        const apiKey = document.getElementById('api-key-input').value;
        const sellerId = document.getElementById('seller-id-input').value;

        // Envia uma mensagem para o content.js com os valores salvos
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {apiKey: apiKey, sellerId: sellerId}, function(response) {
                
            });
        })

        // Salva os valores no armazenamento local
        localStorage.setItem('api_key', apiKey);
        localStorage.setItem('seller_id', sellerId);

        // Mostra uma mensagem de confirmação para o usuário
        alert('Configurações salvas com sucesso!');
    });

});