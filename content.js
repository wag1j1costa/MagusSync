// Encontrar todas as linhas da tabela
const rows = document.querySelectorAll('.table-allTCG-order-0 tbody tr');

let apiKey, sellerId;
const successArray = [];
const errorArray = [];

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.apiKey && message.sellerId) {
        // Use os valores recebidos como desejar
        apiKey = message.apiKey;
        sellerId = message.sellerId;

        // Faça algo com apiKey e sellerId
        console.log('Valores recebidos em content.js:', apiKey, sellerId);
    }
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.savedApiKey && message.savedSellerId) {
        // Use os valores recebidos como desejar
        apiKey = message.savedApiKey;
        sellerId = message.savedSellerId;
    }
});

const tableHeader = document.querySelector('.table-allTCG-order-0 thead tr');
const headerCell = document.createElement('th');
headerCell.textContent = 'Status magus';
tableHeader.appendChild(headerCell);

let promises = [];
// Iterar sobre cada linha, começando do terceiro elemento (índice 2)
for (let i = 2; i < rows.length; i++) {
    const row = rows[i];

    let cardNumber = row.querySelector('td:nth-child(8) font.card-number-small').innerHTML ?? null;
    if (!cardNumber) {
        continue;
    }
    let code = cardNumber.replace(/\((.+?)<b>(\S+)<\/b>\)/g, "$1_$2");
    const cardName = row.querySelector('td:nth-child(8) a:last-of-type').textContent;
    let cardNameParts = cardName.split(/\s\/\s(?!\/)/);
    let cardNameEn = cardNameParts[1] ?? cardNameParts[0];
    cardNameEn = cardNameEn.replace(/\([^)]+\)/, '');
    cardNameEn = cardNameEn.replace('(Art Card with Signature)', '');
    cardNameEn = cardNameEn.replace('(Art Card)', '');
    let edicaoLiga = row.querySelector('td:nth-child(8) .icon.icon-edicao');
    let iconLiga = edicaoLiga ? edicaoLiga.getAttribute('data-src') : null;
    let edicaoLigaTitle = edicaoLiga ? edicaoLiga.getAttribute('title') : null;

    // Faz a requisição AJAX
    let promise = (async () => {
        try {
            let response = await fetch(`https://magusshop.com.br/catalog/collection/getsync?verify=true&code=${code}&name=${cardNameEn}`);
            let data = await response.json();

            // Adicionar botao de sincronizar em caso de data.status === 'error'
            if (data.status === 'success') {
                row.style.backgroundColor = 'lightgreen';
                const cell = document.createElement('td');
            
                // Inserir a nova célula na linha
                row.appendChild(cell);
            }

            if (data.status === 'error') {
                row.style.backgroundColor = 'lightpink';
                // Criar um botão
                const button = document.createElement('button');
                button.textContent = 'Sincronizar';
                button.type = 'button';

                // Criar uma nova célula na coluna de ações e inserir o botão
                const cell = document.createElement('td');
                cell.appendChild(button);
                
                // Inserir a nova célula na linha
                row.appendChild(cell);

                //adicionar evento de click no botão
                button.addEventListener('click', async () => {
                    //mostrar modal com loading
                    Swal.fire({
                        title: 'Pesquisando cards...',
                        html: 'Aguarde enquanto procuramos os cards compatíveis.',
                        allowOutsideClick: false,
                        didOpen: () => {
                            Swal.showLoading();
                        }
                    });
                    //mostrar cards com o mesmo nome no modal com opção de escolher o card correto
                    let response = await fetch(`https://magusshop.com.br/catalog/collection/getsync?name=${cardNameEn}`);
                    let data = await response.json();
                    let cards = data;
                    if(cards.length === 0) {
                        const { value: cardSearch } = await Swal.fire({
                            title: 'Erro',
                            text: 'Não encontramos nenhum card com o nome informado, use o campo de busca para procurar o card manualmente.',
                            icon: 'error',
                            confirmButtonText: 'Buscar',
                            showCancelButton: true,
                            cancelButtonText: 'Cancelar',
                            input: 'text',
                            inputAttributes: {
                                autoLowerCase: 'true',
                                placeholder: 'set_numero',
                            },
                            inputValidator: (value) => {
                                if (!value) {
                                  return "Preciso do código mano";
                                }
                              }
                        });
                        if (cardSearch) {
                            Swal.fire({
                                title: 'Pesquisando cards...',
                                html: 'Aguarde enquanto procuramos os cards compatíveis.',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });
                            let response = await fetch(`https://magusshop.com.br/catalog/collection/getsync?sku=${cardSearch}`);
                            let data = await response.json();
                            cards = data;
                        }
                    }
                    //criar modal no sweet alert
                    let options = '';
                    cards.forEach(card => {
                        options += `
                        <label class="swal2-radio" style="
                            display: flex;
                            align-items: center;
                            border: 1px solid;
                            padding: 8px;
                            border-radius: 8px;
                            width: 95%;
                            justify-content: flex-start;"
                        >
                            <input type="radio" name="card" value="${card.id}">
                            <img src="${card.image}" class="modal-card-image">
                            <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                <span class="card-edition" style="
                                    display: flex;
                                    align-items: center;
                                    justify-content: flex-start;"
                                >
                                    <img src="${card.set_uri}" style="width: 20px; height: 20px; margin-right: 10px;">
                                    ${card.edition}
                                </span>
                                <b>${card.name}</b>
                                <span><b>Cod. Magus:</b> ${card.sku}</span>
                                <span><b>Cod. Liga:</b> ${code}</span>
                            </div>
                        </label>`;

                    });
                    const { value: cardCode } = await Swal.fire({
                        title: `<span style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center;">${cardNameEn}(${code})</span>
                        <span class="card-edition-liga" style="display: flex;align-items: center;gap: 10px;justify-content: flex-start;">
                            <img src="${iconLiga}" style="margin-right: 10px;">${edicaoLigaTitle}
                        </span>
                        `,
                        html:`
                        <div id="cardCode" style="
                            display: flex;
                            flex-direction: column;
                            align-items: flex-start;
                            justify-content: center;
                            gap: 16px;"
                        >
                            ${options}
                        </div>
                        <div class="side-image" >
                        </div>
                        <style>
                            .modal-card-image {
                                width: 50px;
                                height: 70px;
                                margin-right: 10px;
                            }
                            h2#swal2-title {
                                font-size: 16px;
                            }
                            @media (min-width: 1300px) {
                                .swal2-radio:hover .modal-card-image {
                                    width: 312px;
                                    height: auto;
                                    margin-right: 10px;
                                    position: fixed;
                                    top: 150px;
                                    left: 10%;
                                }
                            }
                        </style>
                        `,
                        showCancelButton: true,
                        confirmButtonText: 'Sincronizar',
                        cancelButtonText: 'Cancelar',
                        showDenyButton: true,
                        denyButtonText: 'Busca manual',
                        preConfirm: () => {
                            if (!document.querySelector('input[name="card"]:checked')) {
                                Swal.showValidationMessage('Selecione um card para sincronizar');
                            }
                            return document.querySelector('input[name="card"]:checked').value;
                        }
                    });
                    if (cardCode) {
                        //modal para sincronizar card
                        Swal.fire({
                            title: 'Sincronizando...',
                            html: 'Aguarde enquanto sincronizamos o card.',
                            allowOutsideClick: false,
                            didOpen: () => {
                                Swal.showLoading();
                            }
                        });
                        //sincronizar card
                        try {
                            let response = await fetch(`https://magusshop.com.br/catalog/save/sync?id=${cardCode}&code=${code}`);
                            let data = await response.json();
                            if (data.status === 'success') {
                                row.style.backgroundColor = 'lightgreen';
                                //remove botão de sincronizar
                                cell.remove();
                                successArray.push(`${cardName}`);
                            }
                            if (data.status === 'error') {
                                row.style.backgroundColor = 'lightpink';
                                errorArray.push(`erro ao sincronizar ${cardName}, ${data.message}`);
                            }
                            //mostrar modal com sucesso ou erro
                            Swal.fire({
                                title: data.status === 'success' ? 'Sucesso' : 'Erro',
                                text: data.message,
                                icon: data.status === 'success' ? 'success' : 'error',
                                confirmButtonText: 'Ok'
                            });
                        } catch (error) {
                            errorArray.push(`erro ao sincronizar ${cardName}, ${error}`);
                            Swal.fire({
                                title: 'Erro',
                                text: error,
                                icon: 'error',
                                confirmButtonText: 'Ok'
                            });
                        }
                    }else{
                        //caso queira buscar manualmente
                        let cards = [];
                        const { value: manualSearch } = await Swal.fire({
                            title: 'Busca manual',
                            text: 'Digite o código do card que deseja sincronizar.',
                            icon: 'info',
                            confirmButtonText: 'Buscar',
                            showCancelButton: true,
                            cancelButtonText: 'Cancelar',
                            input: 'text',
                            inputAttributes: {
                                autoLowerCase: 'true',
                                placeholder: 'set_numero',
                            },
                            inputValidator: (value) => {
                                if (!value) {
                                  return "Preciso do código mano";
                                }
                              }
                        });
                        if (manualSearch) {
                            Swal.fire({
                                title: 'Pesquisando cards...',
                                html: 'Aguarde enquanto procuramos os cards compatíveis.',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });
                            let response = await fetch(`https://magusshop.com.br/catalog/collection/getsync?sku=${manualSearch}`);
                            let data = await response.json();
                            cards = data;
                        }else{
                            //modal para tentar novamente
                            const { value: retry } = await Swal.fire({
                                title: 'Busca manual',
                                text: 'Digite o código do card que deseja sincronizar.',
                                icon: 'info',
                                confirmButtonText: 'Buscar',
                                showCancelButton: true,
                                cancelButtonText: 'Cancelar',
                                input: 'text',
                                inputAttributes: {
                                    autoLowerCase: 'true',
                                    placeholder: 'set_numero',
                                },
                                inputValidator: (value) => {
                                    if (!value) {
                                      return "Preciso do código mano";
                                    }
                                  }
                            });
                            if (retry) {
                                Swal.fire({
                                    title: 'Pesquisando cards...',
                                    html: 'Aguarde enquanto procuramos os cards compatíveis.',
                                    allowOutsideClick: false,
                                    didOpen: () => {
                                        Swal.showLoading();
                                    }
                                });
                                let response = await fetch(`https://magusshop.com.br/catalog/collection/getsync?sku=${retry}`);
                                let data = await response.json();
                                cards = data;
                            }
                        }

                        //criar modal no sweet alert
                        let options = '';
                        cards.forEach(card => {
                            options += `
                            <label class="swal2-radio" style="
                                display: flex;
                                align-items: center;
                                border: 1px solid;
                                padding: 8px;
                                border-radius: 8px;
                                width: 95%;
                                justify-content: flex-start;"
                            >
                                <input type="radio" name="card" value="${card.id}">
                                <img src="${card.image}" class="modal-card-image">
                                <div style="display: flex; flex-direction: column; align-items: flex-start;">
                                    <span class="card-edition" style="
                                        display: flex;
                                        align-items: center;
                                        justify-content: flex-start;"
                                    >
                                        <img src="${card.set_uri}" style="width: 20px; height: 20px; margin-right: 10px;">
                                        ${card.edition}
                                    </span>
                                    <b>${card.name}</b>
                                    <span><b>Cod. Magus:</b> ${card.sku}</span>
                                    <span><b>Cod. Liga:</b> ${code}</span>
                                </div>
                            </label>`;

                        });
                        const { value: cardCode } = await Swal.fire({
                            title: `<span style="margin-bottom: 8px; display: flex; align-items: center; justify-content: center;">${cardNameEn}(${code})</span>
                            <span class="card-edition-liga" style="display: flex;align-items: center;gap: 10px;justify-content: flex-start;">
                                <img src="${iconLiga}" style="margin-right: 10px;">${edicaoLigaTitle}
                            </span>
                            `,
                            html:`
                            <div id="cardCode" style="
                                display: flex;
                                flex-direction: column;
                                align-items: flex-start;
                                justify-content: center;
                                gap: 16px;"
                            >
                                ${options}
                            </div>
                            <div class="side-image" >
                            </div>
                            <style>
                                .modal-card-image {
                                    width: 50px;
                                    height: 70px;
                                    margin-right: 10px;
                                }
                                h2#swal2-title {
                                    font-size: 16px;
                                }
                                @media (min-width: 1300px) {
                                    .swal2-radio:hover .modal-card-image {
                                        width: 312px;
                                        height: auto;
                                        margin-right: 10px;
                                        position: fixed;
                                        top: 150px;
                                        left: 10%;
                                    }
                                }
                            </style>
                            `,
                            showCancelButton: true,
                            confirmButtonText: 'Sincronizar',
                            cancelButtonText: 'Cancelar',
                            preConfirm: () => {
                                if (!document.querySelector('input[name="card"]:checked')) {
                                    Swal.showValidationMessage('Selecione um card para sincronizar');
                                }
                                return document.querySelector('input[name="card"]:checked').value;
                            }
                        });
                        if (cardCode) {
                            //modal para sincronizar card
                            Swal.fire({
                                title: 'Sincronizando...',
                                html: 'Aguarde enquanto sincronizamos o card.',
                                allowOutsideClick: false,
                                didOpen: () => {
                                    Swal.showLoading();
                                }
                            });
                            //sincronizar card
                            try {
                                let response = await fetch(`https://magusshop.com.br/catalog/save/sync?id=${cardCode}&code=${code}`);
                                let data = await response.json();
                                if (data.status === 'success') {
                                    row.style.backgroundColor = 'lightgreen';
                                    //remove botão de sincronizar
                                    cell.remove();
                                    successArray.push(`${cardName}`);
                                }
                                if (data.status === 'error') {
                                    row.style.backgroundColor = 'lightpink';
                                    errorArray.push(`erro ao sincronizar ${cardName}, ${data.message}`);
                                }
                                //mostrar modal com sucesso ou erro
                                Swal.fire({
                                    title: data.status === 'success' ? 'Sucesso' : 'Erro',
                                    text: data.message,
                                    icon: data.status === 'success' ? 'success' : 'error',
                                    confirmButtonText: 'Ok'
                                });
                            } catch (error) {
                                errorArray.push(`erro ao sincronizar ${cardName}, ${error}`);
                                Swal.fire({
                                    title: 'Erro',
                                    text: error,
                                    icon: 'error',
                                    confirmButtonText: 'Ok'
                                });
                            }
                        }
                    }
                });
            }

            successArray.push(`${cardName}`);
        } catch (error) {
            errorArray.push(`erro ao sincronizar ${cardName}, ${error}`);
            // Criar uma nova célula na coluna de ações e inserir o botão
            const cell = document.createElement('td');
            
            // Inserir a nova célula na linha
            row.appendChild(cell);
        }
    })();

    promises.push(promise);

    
}


