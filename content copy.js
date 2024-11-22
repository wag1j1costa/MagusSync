// Encontrar todas as linhas da tabela
const rows = document.querySelectorAll('.table-allTCG-order-0 tbody tr');

let apiKey, sellerId;

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
headerCell.textContent = 'Ações da magus';
tableHeader.appendChild(headerCell);

// Iterar sobre cada linha, começando do terceiro elemento (índice 2)
for (let i = 0; i < rows.length - 1; i++) {
    if (i === 0) {
        const topBodyCell = document.createElement('td');
        const magusButton = document.createElement('button');
        magusButton.type = 'button';
        magusButton.className = 'btn-acao btn btn-primary';
        magusButton.textContent = 'Aplicar MAGUS';
        const topBodyCellRow = rows[i];
        topBodyCell.appendChild(magusButton);
        topBodyCellRow.appendChild(topBodyCell);

        magusButton.addEventListener('click', () => {
            const successArray = [];
            const errorArray = [];
            let promises = [];

            //ativar Swal com loading
            Swal.fire({
                icon: "info",
                title: "Atualizando estoque na Magus Market",
                html: "Aguarde, estamos atualizando o estoque na Magus Market...",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            //percorre todas as linhas da tabela e atualiza todos os cards na magus de acordo com o estoque e preço da tabela
            //linhas sem estoque não são atualizadas
            //todos os cards não encontrados na magus são adicionados ao array de erro
            //todos os cards encontrados na magus são adicionados ao array de sucesso
            
            for (let i = 2; i < rows.length - 1; i++) {
                const row = rows[i];
    
                let cardNumber = row.querySelector('td:nth-child(8) font.card-number-small').innerHTML ?? null;
                let code = cardNumber.replace(/\((.+?)<b>(\S+)<\/b>\)/g, "$1_$2"); // Formata cada linha e junta novamente
                const nomeProdutoLiga = row.querySelector('td:nth-child(8) a:nth-child(2)').textContent;
                const precoLigaElement = row.querySelector('td:nth-child(3) input[type="text"]');
                const precoLiga = precoLigaElement ? precoLigaElement.value : null;

                const idiomaLigaElement = row.querySelector('td:nth-child(5) select option[selected]');
                const idiomaLiga = idiomaLigaElement ? idiomaLigaElement.value : null;

                const qualidadeLigaElement = row.querySelector('td:nth-child(6) select option[selected]');
                const qualidadeLiga = qualidadeLigaElement ? qualidadeLigaElement.value : null;

                const extrasLigaElement = row.querySelector('td:nth-child(7) select');
                let extrasLiga = [];

                if (extrasLigaElement) {
                    for (let option of extrasLigaElement.options) {
                        if (option.selected) {
                            extrasLiga.push(option.value);
                        }
                    }
                }

                const estoqueLigaElement = row.querySelector('td:nth-child(1) input[type="text"]');
                const estoqueLiga = estoqueLigaElement ? estoqueLigaElement.value : null;

                if (estoqueLiga === null || estoqueLiga === '' || estoqueLiga === '0') {
                    continue;
                }

                if (!apiKey || !sellerId) {
                    // alert('Por favor, configure a extensão com a sua chave de API e ID de vendedor.');
                    Swal.fire({
                        icon: "question",
                        title: "Ative a extensão!",
                        text: "Por favor, configure a extensão com a sua chave de API e ID de vendedor.",
                        footer: '<a href="#">Precisa de ajuda?</a>'
                    });
                    return;
                }

                //montar parametros idioma, qualidade e extras
                if (idiomaLiga) {
                    code += `&idioma=${idiomaLiga}`;
                }
                if (qualidadeLiga) {
                    code += `&qualidade=${qualidadeLiga}`;
                }
                if (extrasLiga) {
                    code += `&extras=${extrasLiga}`;
                }

                let skuForUpdate = null;

                // Faz a requisição AJAX
                let promise = (async () => {
                    try {
                        let response = await fetch(`https://magusmarket.com.br/catalog/collection/sellerstock/?sku=${code}&seller_id=${sellerId}&key=${apiKey}`);
                        let data = await response.json();
            
                        const newStock = estoqueLiga;
                        const newPrice = precoLiga.replace(',','.');
            
                        let skuForUpdate = data[0] ? data[0].sku : null;
                        if (skuForUpdate === null) {
                            errorArray.push(`${nomeProdutoLiga}`);
                            return;
                        }
                        const stockUrl = `https://magusmarket.com.br/catalog/save/sellerproduct/?sku=${skuForUpdate}&seller_id=${sellerId}&key=${apiKey}&stock=${newStock}&price=${newPrice}`;
            
                        response = await fetch(stockUrl);
                        data = await response.json();
            
                        successArray.push(`${nomeProdutoLiga}`);
                    } catch (error) {
                        errorArray.push(`${nomeProdutoLiga}`);
                        console.log(error);
                    }
                })();
            
                promises.push(promise);

            }
            Promise.all(promises)
                .then(() => {
                    let successHtml = successArray.map(item => `<p>${item}</p>`).join('');
                    let errorHtml = errorArray.map(item => `<p>${item}</p>`).join('');

                    Swal.fire({
                        icon: "success",
                        title: "Resultado da atualização",
                        html: `
                            <p><b>Atualizados com sucesso: ${successArray.length}</b></p>
                            ${successHtml}
                            <p><b>Erros: ${errorArray.length}</b></p>
                            ${errorHtml}
                        `,
                        footer: '<a href="#">Precisa de ajuda?</a>'
                    });
                })
                .catch((error) => {
                    console.error("Erro durante a operação assíncrona:", error);
                });
        });
        continue;
    }

    if (i === 1) {
        continue;
    }

    const row = rows[i];

    // Criar um elemento de botão
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn-acao btn btn-primary';
    button.textContent = 'MAGUS';

    button.addEventListener('click', () => {
        let cardNumber = row.querySelector('td:nth-child(8) font.card-number-small').innerHTML ?? null;
        let code = cardNumber.replace(/\((.+?)<b>(\S+)<\/b>\)/g, "$1_$2"); // Formata cada linha e junta novamente
        const precoLigaElement = row.querySelector('td:nth-child(3) input[type="text"]');
        const precoLiga = precoLigaElement ? precoLigaElement.value : null;

        const idiomaLigaElement = row.querySelector('td:nth-child(5) select option[selected]');
        const idiomaLiga = idiomaLigaElement ? idiomaLigaElement.value : null;

        const qualidadeLigaElement = row.querySelector('td:nth-child(6) select option[selected]');
        const qualidadeLiga = qualidadeLigaElement ? qualidadeLigaElement.value : null;

        const extrasLigaElement = row.querySelector('td:nth-child(7) select');
        let extrasLiga = [];

        if (extrasLigaElement) {
            for (let option of extrasLigaElement.options) {
                if (option.selected) {
                    extrasLiga.push(option.value);
                }
            }
        }

        const estoqueLigaElement = row.querySelector('td:nth-child(1) input[type="text"]');
        const estoqueLiga = estoqueLigaElement ? estoqueLigaElement.value : null;

        if (!apiKey || !sellerId) {
            // alert('Por favor, configure a extensão com a sua chave de API e ID de vendedor.');
            Swal.fire({
                icon: "question",
                title: "Ative a extensão!",
                text: "Por favor, configure a extensão com a sua chave de API e ID de vendedor.",
                footer: '<a href="#">Precisa de ajuda?</a>'
            });
            return;
        }

        //montar parametros idioma, qualidade e extras
        if (idiomaLiga) {
            code += `&idioma=${idiomaLiga}`;
        }
        if (qualidadeLiga) {
            code += `&qualidade=${qualidadeLiga}`;
        }
        if (extrasLiga) {
            code += `&extras=${extrasLiga}`;
        }

        // Faz a requisição AJAX
        fetch(`https://magusmarket.com.br/catalog/collection/sellerstock/?sku=${code}&seller_id=${sellerId}&key=${apiKey}`)
            .then(response => response.json())
            .then(data => {
                // Manipula os dados recebidos
                var nomeProduto = data[0].name;
                var precoProduto = data[0].price;
                var preco_valor = data[0].price_value;
                var skuProduto = data[0].sku;
                var qualidadeProduto = data[0].quality;
                var extrasProduto = data[0].extras;
                var estoqueProduto = data[0].stock;
                var idiomaProduto = data[0].idiom;
                var imgProduto = data[0].image;
                
                Swal.fire({
                    title: "<h2>Meu estoque na Magus Market</h2>",
                    icon: "info",
                    width: 520,
                    padding: "3em",
                    html: `
                        <div>
                        <div class="modal-content-wrp" style="
                            display: flex;
                            flex-direction: row;
                            align-items: flex-start;
                            gap: 36px;
                            margin: 24px 0;">
                            <div class="modal-img">
                            <img src="${imgProduto}" alt="${nomeProduto}">
                            </div>
                            <div class="modal-content" style="
                                display: flex;
                                flex-direction: column;
                                align-items: flex-start;">
                                <p><b>Produto: </b>${nomeProduto}</p>
                                <p><b>Preço na Magus: </b>${precoProduto}</p>
                                <p><b>SKU: </b>${skuProduto}</p>
                                <p><b>Qualidade: </b>${qualidadeProduto}</p>
                                <p><b>Extras: </b>${extrasProduto}</p>
                                <p><b>Estoque: </b>${estoqueProduto}</p>
                                <p><b>Idioma: </b>${idiomaProduto}</p>
                                <label for="swal-input1" style="margin-top: 24px;">Novo estoque:</label>
                                <input type="number" value="${estoqueLiga}" id="swal-input1" class="swal2-input" style="width: 200px; margin: 0;" placeholder="novo estoque" min="0" max="9999" required>
                                <label for="swal-input2" style="margin-top: 10px;">Novo preço:</label>
                                <input value="${precoLiga.replace(',','.')}" id="swal-input2" type="text" class="swal2-input" style="width: 200px; margin: 0;" placeholder="novo preço">
                            </div>
                        </div>
                    </div>
                    `,
                    showDenyButton: false,
                    showCancelButton: true,
                    confirmButtonText: "Salvar",
                    denyButtonText: `Don't save`,
                    cancelButtonText: "Cancelar",
                    focusConfirm: true,
                    showLoaderOnConfirm: true,
                    preConfirm: async () => {
                        try {
                            const newStock = document.getElementById("swal-input1").value;
                            const newPrice = document.getElementById("swal-input2").value;

                            if(!newStock && !newPrice) {
                                Swal.showValidationMessage("Preencha pelo menos um campo!");
                            }

                            const stockUrl = `
                            https://magusmarket.com.br/catalog/save/sellerproduct/?sku=${skuProduto}&seller_id=${sellerId}&key=${apiKey}&stock=${newStock}&price=${newPrice}
                            `;
                            const response = await fetch(stockUrl);
                            if (!response.ok) {
                              return Swal.showValidationMessage(`
                                ${JSON.stringify(await response.json())}
                              `);
                            }
                            return response.json();
                          } catch (error) {
                            Swal.showValidationMessage(`
                              Request failed: ${error}
                            `);
                          }
                    },
                    allowOutsideClick: () => !Swal.isLoading()
                }).then((result) => {
                    if (result.isConfirmed) {
                      Swal.fire({
                        icon: "success",
                        title: `Produto ${nomeProduto} atualizado com sucesso!`,
                        showConfirmButton: false,
                      });
                    }
                });

                code = null;

            })
            .catch(error => {
                Swal.fire({
                    icon: "error",
                    title: "Oops...",
                    text: "Produto não encontrado na Magus Market!",
                    footer: '<a href="#">Vamos lá cadastrar?</a>'
                  });
                code = null;
            });
    });

    // Criar uma nova célula na coluna de ações e inserir o botão
    const cell = document.createElement('td');
    cell.appendChild(button);
    
    // Inserir a nova célula na linha
    row.appendChild(cell);
}
