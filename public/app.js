
const products = {};
for (let i = 1; i <= 12; i++) {
    const val = (i / 100).toFixed(2);
    products[String(i)] = {
        name: `Micro Payment Option ${i}`,
        description: `Test transaction for $${val} USD`,
        value: val,
        type: "order"
    };
}
products["SUB"] = {
    name: "Daily Subscription",
    description: "Daily billing of $0.01 for testing",
    value: "0.01",
    type: "subscription"
};
products["CUSTOM"] = {
    name: "Custom Monthly Subscription",
    description: "You decide the amount and billing day",
    value: "VARIES",
    type: "subscription_custom"
};

const productSelect = document.getElementById("product-select");
const amountDisplay = document.getElementById("amount-display");
const productName = document.getElementById("product-name");
const productDesc = document.getElementById("product-desc");
const customOptions = document.getElementById("custom-options");
const customAmountInput = document.getElementById("custom-amount");
const billingDaySelect = document.getElementById("billing-day");

// Utilities
const populateBillingDays = () => {
    if (!billingDaySelect) return;
    billingDaySelect.innerHTML = "";
    for (let i = 1; i <= 31; i++) {
        const option = document.createElement("option");
        option.value = i;
        option.textContent = i + (i === 1 ? "st" : i === 2 ? "nd" : i === 3 ? "rd" : "th") + " of Month";
        billingDaySelect.appendChild(option);
    }
    // Set default to today
    billingDaySelect.value = new Date().getDate();
};

// Populate the select dropdown dynamically
if (productSelect) {
    populateBillingDays();

    productSelect.innerHTML = ""; // Clear existing options
    Object.keys(products).forEach(id => {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = products[id].value === "VARIES"
            ? products[id].name
            : `${products[id].name} - $${products[id].value}`;
        productSelect.appendChild(option);
    });

    // Initialize display with the first item
    const firstId = Object.keys(products)[0];
    updateDisplay(firstId);

    productSelect.addEventListener("change", (e) => {
        updateDisplay(e.target.value);
        initializeButtons(); // Re-render payment buttons
    });

    // Listen for custom input changes to update price display if needed
    customAmountInput.addEventListener("input", (e) => {
        if (productSelect.value === "CUSTOM") {
            amountDisplay.textContent = e.target.value || "0.00";
        }
    });
}

function updateDisplay(productId) {
    const product = products[productId];
    if (product) {
        if (product.value === "VARIES") {
            amountDisplay.textContent = customAmountInput.value;
            customOptions.style.display = "block";
        } else {
            amountDisplay.textContent = product.value;
            customOptions.style.display = "none";
        }
        productName.textContent = product.name;
        productDesc.textContent = product.description;
    }
}

let subscriptionPlanId = "";
let currentButtons = null;

// Initialize PayPal SDK dynamically
async function loadPayPalSDK() {
    try {
        const response = await fetch("/api/config");
        const config = await response.json();
        const clientId = config.clientId;
        subscriptionPlanId = config.subscriptionPlanId;

        if (!clientId) {
            resultMessage("Error: PayPal Client ID not found in server config.", "error");
            return;
        }

        const script = document.createElement("script");
        script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD&vault=true&intent=capture`;

        script.onload = initializeButtons;
        document.body.appendChild(script);
    } catch (error) {
        console.error("Failed to load PayPal SDK:", error);
        resultMessage("Failed to load payment system.", "error");
    }
}

function initializeButtons() {
    if (currentButtons) {
        currentButtons.close();
    }

    const selectedId = productSelect ? productSelect.value : "1";
    const selectedProduct = products[selectedId];
    const isSubscription = selectedProduct && (selectedProduct.type === "subscription" || selectedProduct.type === "subscription_custom");

    const buttonConfig = {
        style: {
            shape: "rect",
            layout: "vertical",
            color: isSubscription ? "blue" : "gold",
            label: isSubscription ? "subscribe" : "paypal",
        },
    };

    if (isSubscription) {
        buttonConfig.createSubscription = async function (data, actions) {
            let planIdToUse = subscriptionPlanId;
            let startTime = undefined;

            if (selectedProduct.type === "subscription_custom") {
                // 1. Create Dynamic Plan
                const amount = customAmountInput.value;
                try {
                    const planRes = await fetch("/api/plans", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount })
                    });
                    const planData = await planRes.json();
                    planIdToUse = planData.id;
                } catch (err) {
                    console.error(err);
                    throw new Error("Failed to create custom plan");
                }

                // 2. Calculate Start Time
                // PayPal requires an ISO string. Timezone: UTC is safest.
                const billingDay = parseInt(billingDaySelect.value);
                const now = new Date();
                // Create date for this month on the target day.
                let targetDate = new Date(now.getFullYear(), now.getMonth(), billingDay, 10, 0, 0); // 10 AM local time

                // If the target day has already passed this month (or is today), move to next month
                // Adding a small buffer (e.g. 5 minutes) to ensure start_time > now if selecting "today"
                if (targetDate <= new Date(now.getTime() + 5 * 60000)) {
                    targetDate.setMonth(targetDate.getMonth() + 1);
                }

                startTime = targetDate.toISOString();
                console.log(`Custom Subscription: Plan ${planIdToUse}, Start Time: ${startTime}`);
            }

            return actions.subscription.create({
                'plan_id': planIdToUse,
                'start_time': startTime
            });
        };

        buttonConfig.onApprove = function (data, actions) {
            resultMessage(`Subscription Active!<br>ID: ${data.subscriptionID}<br>Check your PayPal account for recurring schedule.`, 'success');
            console.log("Subscription result", data);
        };
    } else {
        // One-time payment configuration
        buttonConfig.createOrder = async function () {
            try {
                const response = await fetch("/api/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cart: [{ id: selectedId, quantity: "1" }]
                    }),
                });

                const orderData = await response.json();
                if (orderData.id) return orderData.id;

                const errorDetail = orderData?.details?.[0];
                const errorMessage = errorDetail
                    ? `${errorDetail.issue} ${errorDetail.description} (${orderData.debug_id})`
                    : JSON.stringify(orderData);
                throw new Error(errorMessage);
            } catch (error) {
                console.error(error);
                resultMessage(`Could not initiate PayPal Checkout...<br><br>${error}`, 'error');
            }
        };

        buttonConfig.onApprove = async function (data, actions) {
            try {
                const response = await fetch(`/api/orders/${data.orderID}/capture`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
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
                resultMessage(`Sorry, your transaction could not be processed...<br><br>${error}`, 'error');
            }
        };
    }

    currentButtons = window.paypal.Buttons(buttonConfig);
    currentButtons.render("#paypal-button-container");
}

loadPayPalSDK();

// Example function to show a result to the user. Your site's UI library can be used instead.
function resultMessage(message, type) {
    const container = document.querySelector("#result-message");
    container.innerHTML = message;
    container.className = type;
    container.style.display = "block";
}
