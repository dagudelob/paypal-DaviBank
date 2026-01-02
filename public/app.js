
// Check if the script is loaded with a dummy Client ID
const script = document.querySelector('script[src*="client-id=test"]');
if (script) {
    console.warn("Using TEST Client ID. Please update index.html with your actual Sandbox Client ID from PayPal.");
}

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
                // use the "body" param to optionally pass additional order information
                // like product ids and quantities
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
            // Three cases to handle:
            //   (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
            //   (2) Other non-recoverable errors -> Show a failure message
            //   (3) Successful transaction -> Show confirmation or thank you message

            const errorDetail = orderData?.details?.[0];

            if (errorDetail?.issue === "INSTRUMENT_DECLINED") {
                // (1) Recoverable INSTRUMENT_DECLINED -> call actions.restart()
                // recoverable state, per https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/
                return actions.restart();
            } else if (errorDetail) {
                // (2) Other non-recoverable errors -> Show a failure message
                throw new Error(`${errorDetail.description} (${orderData.debug_id})`);
            } else if (!orderData.purchase_units) {
                throw new Error(JSON.stringify(orderData));
            } else {
                // (3) Successful transaction -> Show confirmation or thank you message
                // Or go to another URL:  actions.redirect('thank_you.html');
                const transaction =
                    orderData?.purchase_units?.[0]?.payments?.captures?.[0] ||
                    orderData?.purchase_units?.[0]?.payments?.authorizations?.[0];
                resultMessage(
                    `Transaction ${transaction.status}: ${transaction.id}<br><br>See console for all available details`, 'success'
                );
                console.log(
                    "Capture result",
                    orderData,
                    JSON.stringify(orderData, null, 2),
                );
            }
        } catch (error) {
            console.error(error);
            resultMessage(
                `Sorry, your transaction could not be processed...<br><br>${error}`, 'error'
            );
        }
    },
}).render("#paypal-button-container");

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message, type) {
    const container = document.querySelector("#result-message");
    container.innerHTML = message;
    container.className = type;
    container.style.display = "block";
}
