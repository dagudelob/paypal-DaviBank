

const products = {};
for (let i = 1; i <= 12; i++) {
    const val = (i / 100).toFixed(2);
    products[String(i)] = {
        name: `Micro Payment Option ${i}`,
        description: `Test transaction for $${val} USD`,
        value: val
    };
}

const productSelect = document.getElementById("product-select");
const amountDisplay = document.getElementById("amount-display");
const productName = document.getElementById("product-name");
const productDesc = document.getElementById("product-desc");

// Populate the select dropdown dynamically
if (productSelect) {
    productSelect.innerHTML = ""; // Clear existing options
    Object.keys(products).forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `${products[id].name} - $${products[id].value}`;
        productSelect.appendChild(option);
    });

    // Initialize display with the first item
    const firstId = Object.keys(products)[0];
    updateDisplay(firstId);

    productSelect.addEventListener("change", (e) => {
        updateDisplay(e.target.value);
    });
}

function updateDisplay(productId) {
    const product = products[productId];
    if (product) {
        amountDisplay.textContent = product.value;
        productName.textContent = product.name;
        productDesc.textContent = product.description;
    }
}

// Initialize PayPal SDK dynamically
async function loadPayPalSDK() {
    try {
        const response = await fetch("/api/config");
        const { clientId } = await response.json();

        if (!clientId) {
            resultMessage("Error: PayPal Client ID not found in server config.", "error");
            return;
        }

        const script = document.createElement("script");
        // Ensure currency is USD for this demo
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
        script.onload = initializeButtons;
        document.body.appendChild(script);
    } catch (error) {
        console.error("Failed to load PayPal SDK:", error);
        resultMessage("Failed to load payment system.", "error");
    }
}

function initializeButtons() {
    window.paypal.Buttons({
        style: {
            shape: "rect",
            layout: "vertical",
            color: "gold",
            label: "paypal",
        },
        async createOrder() {
            try {
                const response = await fetch("/api/orders", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        cart: [
                            {
                                id: productSelect ? productSelect.value : "1",
                                quantity: "1",
                            },
                        ],
                    }),
                });

                const orderData = await response.json();

                if (orderData.id) {
                    return orderData.id;
                } else {
                    const errorDetail = orderData?.details?.[0];
                    const errorMessage = errorDetail
                        ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                        : JSON.stringify(orderData);

                    throw new Error(errorMessage);
                }
            } catch (error) {
                console.error(error);
                resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`, 'error');
            }
        },
        async onApprove(data, actions) {
            try {
                const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                const orderData = await response.json();

                const errorDetail = orderData?.details?.[0];

                if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                    return actions.restart();
                } else if (errorDetail) {
                    throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
                } else if (!orderData.purchase_units) {
                    throw new Error(JSON.stringify(orderData));
                } else {
                    const transaction =
                        orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                        orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
                    resultMessage(
                        `Transaction ${transaction.status}: ${transaction.id}<br>Value: $${transaction.amount.value} ${transaction.amount.currency_code}`, 'success'
                    );
                    console.log("Capture result", orderData);
                }
            } catch (error) {
                console.error(error);
                resultMessage(
                    `Sorry, your transaction could not be processed...<br><br>${error}`, 'error'
                );
            }
        },
    }).render("#paypal-button-container");
}

loadPayPalSDK();

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message, type) {
    const container = document.querySelector("#result-message");
    container.innerHTML = message;
    container.className = type;
    container.style.display = "block";
}
