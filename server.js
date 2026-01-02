import express from "express";
import fetch from "node-fetch";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PORT = 3000, PAYPAL_API_BASE } = process.env;
const base = PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static("public"));
app.use(express.json());

// Generate an OAuth 2.0 access token for authenticating with PayPal
const generateAccessToken = async () => {
    try {
        if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
            throw new Error("MISSING_API_CREDENTIALS");
        }
        const auth = Buffer.from(
            PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET
        ).toString("base64");
        const response = await fetch(`${base}/v1/oauth2/token`, {
            method: "POST",
            body: "grant_type=client_credentials",
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error("Failed to generate Access Token:", error);
    }
};

// Mock database of products
// Generating 12 micro-payment options: 0.01 to 0.12 USD
const products = {};
for (let i = 1; i <= 12; i++) {
    const val = (i / 100).toFixed(2);
    products[String(i)] = {
        id: String(i),
        name: `Micro Payment $${val}`,
        value: val,
    };
}

// Create an order to start the transaction
const createOrder = async (cart) => {
    // cart information passed from the frontend
    console.log("shopping cart information passed from the frontend createOrder() callback:", cart);

    // Calculate the total amount on the server to prevent manipulation
    let totalValue = "0.00";
    if (cart && cart.length > 0) {
        // Simple logic for this demo: sum up items from the mock database
        let total = 0;
        cart.forEach((item) => {
            const product = products[item.id];
            if (product) {
                total += parseFloat(product.value) * parseInt(item.quantity);
            }
        });
        totalValue = total.toFixed(2);
    } else {
        // Fallback for demo if cart is empty, or error out
        console.log("Cart is empty or invalid, using default");
        totalValue = "100.00";
    }

    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders`;
    const payload = {
        intent: "CAPTURE",
        purchase_units: [
            {
                amount: {
                    currency_code: "USD",
                    value: totalValue,
                },
            },
        ],
    };

    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
            // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
            // "PayPal-Mock-Response": '{"mock_application_codes": "MISSING_REQUIRED_PARAMETER"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "PERMISSION_DENIED"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
        },
        method: "POST",
        body: JSON.stringify(payload),
    });

    return handleResponse(response);
};

// Capture payment for the created order to complete the transaction
const captureOrder = async (orderID) => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            // Uncomment one of these to force an error for negative testing (in sandbox mode only). Documentation:
            // https://developer.paypal.com/tools/sandbox/negative-testing/request-headers/
            // "PayPal-Mock-Response": '{"mock_application_codes": "INSTRUMENT_DECLINED"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "TRANSACTION_REFUSED"}'
            // "PayPal-Mock-Response": '{"mock_application_codes": "INTERNAL_SERVER_ERROR"}'
        },
    });

    return handleResponse(response);
};

async function handleResponse(response) {
    try {
        const jsonResponse = await response.json();
        return {
            jsonResponse,
            httpStatusCode: response.status,
        };
    } catch (err) {
        const errorMessage = await response.text();
        throw new Error(errorMessage);
    }
}



app.post("/api/orders", async (req, res) => {
    try {
        // use the cart information passed from the frontend to calculate the order amount detals
        const { cart } = req.body;
        const { jsonResponse, httpStatusCode } = await createOrder(cart);
        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
});

const transactions = [];

app.post("/api/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;
        const { jsonResponse, httpStatusCode } = await captureOrder(orderID);

        // If payment is successful, save to our mock database
        if (httpStatusCode === 200 || httpStatusCode === 201) {
            const captureStatus = jsonResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.status;
            const captureId = jsonResponse?.purchase_units?.[0]?.payments?.captures?.[0]?.id;

            if (captureStatus === "COMPLETED") {
                transactions.push({
                    orderID,
                    captureId,
                    status: captureStatus,
                    timestamp: new Date().toISOString()
                });
                console.log("✅ Payment Captured & Saved to DB:", transactions);
            }
        }

        res.status(httpStatusCode).json(jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
});

let subscriptionPlanId = "";

const createProduct = async () => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v1/catalogs/products`;
    const payload = {
        name: "Video Streaming Service",
        description: "Video streaming service",
        type: "SERVICE",
        category: "SOFTWARE",
        image_url: "https://example.com/streaming.jpg",
        home_url: "https://example.com/home"
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": Date.now().toString() // unique ID
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data.id;
};

const createPlan = async (productId, amount = "0.01") => {
    const accessToken = await generateAccessToken();
    const url = `${base}/v1/billing/plans`;
    const payload = {
        product_id: productId,
        name: `Monthly Subscription $${amount}`,
        description: `Monthly plan for ${amount}`,
        status: "ACTIVE",
        billing_cycles: [
            {
                frequency: {
                    interval_unit: "MONTH",
                    interval_count: 1
                },
                tenure_type: "REGULAR",
                sequence: 1,
                total_cycles: 0,
                pricing_scheme: {
                    fixed_price: {
                        value: amount,
                        currency_code: "USD"
                    }
                }
            }
        ],
        payment_preferences: {
            auto_bill_outstanding: true,
            setup_fee: {
                value: "0",
                currency_code: "USD"
            },
            setup_fee_failure_action: "CONTINUE",
            payment_failure_threshold: 3
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "PayPal-Request-Id": Date.now().toString()
        },
        body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("Created Plan:", data);
    return data.id;
};

app.post("/api/plans", async (req, res) => {
    try {
        const { product_id, amount } = req.body;
        // Use the existing video service product if no product_id provided
        const prodId = product_id || await createProduct(); // Reuse existing function to get/create

        const planId = await createPlan(prodId, amount);
        res.json({ id: planId });
    } catch (error) {
        console.error("Failed to create plan:", error);
        res.status(500).json({ error: "Failed to create plan." });
    }
});

app.get("/api/config", (req, res) => {
    res.json({
        clientId: process.env.PAYPAL_CLIENT_ID,
        subscriptionPlanId: subscriptionPlanId
    });
});

app.get("/", (req, res) => {
    res.sendFile(path.resolve(__dirname, "public/index.html"));
});

app.listen(PORT, async () => {
    console.log(`Node server listening at http://localhost:${PORT}/`);
    console.log(`Make sure to Create a .env file with PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET`);

    try {
        const prodId = await createProduct();
        subscriptionPlanId = await createPlan(prodId);
        console.log("✅ Subscription Plan Initialized:", subscriptionPlanId);
    } catch (err) {
        console.error("Failed to init subscription plan:", err);
    }
});
