import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBUUEHFPPFihtvupkKrQzpvFCNaO82cYSg",
    authDomain: "canteen-app-6cd97.firebaseapp.com",
    databaseURL: "https://canteen-app-6cd97-default-rtdb.firebaseio.com",
    projectId: "canteen-app-6cd97",
    storageBucket: "canteen-app-6cd97.firebasestorage.app",
    messagingSenderId: "412767916198",
    appId: "1:412767916198:web:52e1743def9d0fe60ce467"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- Auth ---
const ADMIN_CRED = { user: "admin", pass: "123" }; 

window.login = () => {
    const userVal = document.getElementById('username').value.trim();
    const passVal = document.getElementById('password').value.trim();

    if (!userVal) {
        alert("Please enter a name to continue.");
        return;
    }

    if (userVal.toLowerCase() === ADMIN_CRED.user) {
        if (passVal === ADMIN_CRED.pass) {
            localStorage.setItem('userRole', 'admin');
            window.location.href = 'admin.html';
        } else {
            alert("Incorrect Admin Password!");
        }
    } else {
        localStorage.setItem('userRole', 'customer');
        localStorage.setItem('customerName', userVal);
        window.location.href = 'menu.html';
    }
};

window.logout = () => { localStorage.removeItem('cart'); window.location.href = 'index.html'; };

// --- Customer View ---
window.renderMenu = () => {
    onValue(ref(db, 'menu'), (snap) => {
        const menu = snap.val() || {};
        const grid = document.getElementById('food-grid');
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        if(document.getElementById('cart-count')) document.getElementById('cart-count').innerText = cart.length;

        grid.innerHTML = Object.keys(menu).map(key => `
            <div class="food-card">
                <img src="${menu[key].img}" alt="${menu[key].name}">
                <div class="food-info">
                    <h3>${menu[key].name}</h3>
                    <p style="color:#777; font-size:0.9rem">Fresh & Hot</p>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:15px;">
                        <span style="font-size:1.2rem; font-weight:bold; color:var(--primary)">₹${menu[key].price}</span>
                        <button class="btn btn-primary" onclick="addToCart('${key}', '${menu[key].name}', ${menu[key].price})">Add</button>
                    </div>
                </div>
            </div>`).join('');
    });
};

window.addToCart = (id, name, price) => {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push({ id, name, price, qty: 1 });
    localStorage.setItem('cart', JSON.stringify(cart));
    document.getElementById('cart-count').innerText = cart.length;
};

// --- Admin Menu Management ---
window.renderAdminMenu = () => {
    onValue(ref(db, 'menu'), (snap) => {
        const menu = snap.val() || {};
        const tbody = document.querySelector('#admin-menu-table tbody');

        if (!tbody) return;

        tbody.innerHTML = Object.keys(menu).map(id => `
            <tr>
                <td>${menu[id].name}</td>
                <td>₹${menu[id].price}</td>
                <td>
                    <button class="btn btn-danger"
                        onclick="deleteItem('${id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    });
};


// --- Admin Dashboard ---
window.renderAdminDashboard = () => {
    renderAdminMenu(); // ✅ ADD THIS LINE

    onValue(ref(db, 'orders'), (snap) => {
        const orders = snap.val() || {};
        const table = document.querySelector('#admin-orders-table tbody');
        if (!table) return;

        table.innerHTML = Object.keys(orders).map(k => `
            <tr>
                <td>#${k.slice(-4)}</td>
                <td>${orders[k].customer}</td>
                <td>${orders[k].items.map(i => i.name).join(', ')}</td>
                <td>₹${orders[k].total}</td>
                <td>${orders[k].status}</td>
                <td>
                    <button onclick="toggleStatus('${k}', '${orders[k].status}')">
                        Toggle
                    </button>
                </td>
            </tr>
        `).join('');
    });

    onValue(ref(db, 'settings/merchantUpi'), (snap) => {
        if (snap.exists()) {
            document.getElementById('merchant-upi').value = snap.val();
        }
    });
};


window.saveItem = () => {
    const name = document.getElementById('food-name').value;
    const price = document.getElementById('food-price').value;
    const img = document.getElementById('food-img').value || 'https://via.placeholder.com/300';
    push(ref(db, 'menu'), { name, price: parseInt(price), img });
    window.closeModal();
};

window.deleteItem = (id) => remove(ref(db, `menu/${id}`));
window.toggleStatus = (id, s) => update(ref(db, `orders/${id}`), { status: s === 'Paid' ? 'Unpaid' : 'Paid' });

// --- Admin Settings ---
window.saveAdminSettings = async () => {
    const upi = document.getElementById('merchant-upi').value;
    if (!upi) return alert("Please enter a UPI ID");
    
    update(ref(db, 'settings'), { merchantUpi: upi })
        .then(() => alert("UPI Settings Updated!"));
};

// --- Cart & Checkout ---
// --- Enhanced Cart Rendering with Quantity ---
window.renderCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('cart-items');
    const emptyMsg = document.getElementById('empty-cart-msg');
    const cartBox = document.getElementById('cart-container');
    
    if (cart.length === 0) {
        emptyMsg.style.display = 'block';
        cartBox.style.display = 'none';
        return;
    }

    emptyMsg.style.display = 'none';
    cartBox.style.display = 'block';

    let grandTotal = 0;
    container.innerHTML = cart.map((item, i) => {
        const itemTotal = item.price * (item.qty || 1);
        grandTotal += itemTotal;
        return `
            <tr>
                <td>${item.name}</td>
                <td>₹${item.price}</td>
                <td>
                    <button class="qty-btn" onclick="updateQty(${i}, -1)">-</button>
                    <span>${item.qty || 1}</span>
                    <button class="qty-btn" onclick="updateQty(${i}, 1)">+</button>
                </td>
                <td>₹${itemTotal}</td>
                <td><button class="btn-danger" style="padding: 5px 10px;" onclick="removeFromCart(${i})">×</button></td>
            </tr>`;
    }).join('');
    document.getElementById('cart-total').innerText = `₹${grandTotal}`;
};

window.updateQty = (index, change) => {
    let cart = JSON.parse(localStorage.getItem('cart'));
    cart[index].qty = (cart[index].qty || 1) + change;
    if (cart[index].qty < 1) return removeFromCart(index);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
};
window.removeFromCart = (index) => {
    let cart = JSON.parse(localStorage.getItem('cart'));
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
};

window.processCheckout = () => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    if (!cart.length) return alert("Your cart is empty!");
    document.getElementById('payment-modal').style.display = 'flex';
};

// --- Updated Finalize Order (Added Notes) ---
window.finalizeOrder = (method) => {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const total = cart.reduce((s, i) => s + (i.price * i.qty), 0);
    const customer = localStorage.getItem('customerName') || "Guest";
    const notes = document.getElementById('order-notes').value.trim();

    onValue(ref(db, 'settings/merchantUpi'), (snap) => {
        const merchantUpi = snap.val() || "canteen@upi";
        const newOrderRef = push(ref(db, 'orders'));
        const orderData = { 
            customer, 
            items: cart, 
            total, 
            method, 
            notes: notes || "No instructions",
            status: method === 'UPI' ? 'Pending (UPI)' : 'Unpaid', 
            date: new Date().toLocaleString() 
        };

        set(newOrderRef, orderData).then(() => {
            const orderId = newOrderRef.key.slice(-6).toUpperCase();
            localStorage.removeItem('cart');
            window.closePaymentModal();
            
            document.getElementById('order-id-text').innerText = `Order ID: #${orderId}`;
            document.getElementById('success-modal').style.display = 'flex';

            if (method === 'UPI') {
                document.getElementById('upi-info-container').style.display = 'block';
                document.getElementById('final-amount-btn').innerText = total;
                document.getElementById('pay-now-btn').href = `upi://pay?pa=${merchantUpi}&pn=NEC-Canteen&am=${total}&cu=INR&tn=Order-${orderId}`;
            } else {
                document.getElementById('upi-info-container').style.display = 'none';
            }
        });
    }, { onlyOnce: true });
};

window.saveAdminSettings = () => {
    const upi = document.getElementById('merchant-upi').value;
    const btn = event.target;
    if (!upi) return alert("Enter a UPI ID");

    // UX: Show loading feedback
    btn.innerText = "Updating...";
    btn.classList.add('loading');

    update(ref(db, 'settings'), { merchantUpi: upi }).then(() => {
        setTimeout(() => {
            btn.innerText = "Update UPI ID";
            btn.classList.remove('loading');
            alert("Settings Updated!");
        }, 500);
    });
};



window.closePaymentModal = () => document.getElementById('payment-modal').style.display = 'none';
window.openModal = () => document.getElementById('item-modal').style.display = 'flex';
window.closeModal = () => document.getElementById('item-modal').style.display = 'none';
