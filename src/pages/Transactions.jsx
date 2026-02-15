  import { useEffect, useState } from "react";
  import "../styles/transactions.css";
  import { getAllProducts } from "../services/firestoreServices";
  import { ref, push, get, child } from "firebase/database";
  import { db } from "../firebase";
  import { jsPDF } from 'jspdf';
  import 'jspdf-autotable';
  import { useNavigate } from 'react-router-dom';
  import logo from "../images/logo.jpg";

  export default function POS() {
    const [products, setProducts] = useState([]);
    const [customerName, setCustomerName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [selectedProducts, setSelectedProducts] = useState([]);
    const [discountPercent, setDiscountPercent] = useState(0);

    const transactionsRef = ref(db, "transactions");

    const fetchProducts = async () => {
      const data = await getAllProducts();
      setProducts(data);
    };

    useEffect(() => {
      fetchProducts();
    }, []);

    const filteredProducts = products.filter((product) =>
      product.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.details?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const addProductToCart = (product) => {
      setSelectedProducts([
        ...selectedProducts,
        {
          id: product.id,
          title: product.title,
          details: product.details || product.detail || "",
          price: product.price,
          category: product.category || "",
          stock: product.stock || 0,
          timestamp: new Date().getTime(),
        },
      ]);
    };

    const removeProductFromCart = (timestamp) => {
      setSelectedProducts(
        selectedProducts.filter((product) => product.timestamp !== timestamp)
      );
    };

    const calculateTotal = () => {
      return selectedProducts.reduce(
        (total, product) => total + product.price,
        0
      );
    };

    const formatDate = (date) => {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    const imageToDataUrl = (url) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve({ dataUrl: canvas.toDataURL('image/jpeg'), width: img.width, height: img.height });
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = (e) => reject(e);
        img.src = url;
      });
    };

    const generateReceiptPDF = async (transactionData) => {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // add logo if available
      try {
        const imgObj = await imageToDataUrl(logo);
        const desiredWidth = 40; // mm
        const desiredHeight = (imgObj.height / imgObj.width) * desiredWidth;
        // center horizontally: (210 - desiredWidth) / 2 = 85 when desiredWidth=40
        doc.addImage(imgObj.dataUrl, 'JPEG', 85, 10, desiredWidth, desiredHeight);
      } catch (err) {
        console.error('Failed to load logo for PDF:', err);
      }

      // Add header text
      doc.setFontSize(22);
      doc.text('Toledo Doctors', 105, 35, { align: 'center' });
      
      doc.setFontSize(12);
      doc.text('123 Medical Center Drive', 105, 28, { align: 'center' });
      doc.text('Toledo, City', 105, 34, { align: 'center' });
      doc.text('Contact: (123) 456-7890', 105, 40, { align: 'center' });
      
      // Add receipt title
      doc.setFontSize(18);
      doc.text('INVOICE', 105, 60, { align: 'center' });
      
      // Add receipt details
      doc.setFontSize(10);
      doc.text(`Receipt #: ${transactionData.id}`, 20, 75);
      doc.text(`Date: ${formatDate(transactionData.finishedAt)}`, 20, 80);
      doc.text(`Customer: ${transactionData.customerName}`, 20, 85);
      
      // Prepare table data
      const headers = [['Product', 'Price (P)']];
      const data = transactionData.products.map(product => [
        product.productName + (product.details ? ` — ${product.details}` : ''),
        `P${Math.round(parseFloat(product.price) || 0)}`
      ]);

      // Calculate totals
      const subtotal = transactionData.products.reduce((sum, product) => sum + parseFloat(product.price || 0), 0);
      const discount = parseFloat(transactionData.discountPercent || 0);
      const discountAmount = Math.round((subtotal * (discount / 100)) * 100) / 100;
      const finalTotal = Math.round((subtotal - discountAmount) * 100) / 100;

      // Add subtotal, discount and total rows
      data.push([
        { content: 'SUBTOTAL', styles: { fontStyle: 'bold' }},
        { content: `P${Math.round(subtotal)}`, styles: { fontStyle: 'bold' }}
      ]);

      if (discount > 0) {
        data.push([
          { content: `DISCOUNT (${discount}% )`, styles: { fontStyle: 'bold' }},
          { content: `-P${discountAmount}`, styles: { fontStyle: 'bold' }}
        ]);
      }

      data.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold' }},
        { content: `P${finalTotal}`, styles: { fontStyle: 'bold' }}
      ]);
      
      // Generate table
      doc.autoTable({
        startY: 95,
        head: headers,
        body: data,
        theme: 'grid',
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'left' },
          1: { cellWidth: 'auto', halign: 'right' }
        },
        margin: { left: 20, right: 20 },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          lineWidth: 0.1
        },
        didDrawPage: function (data) {
          // Footer
          const pageSize = doc.internal.pageSize;
          const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
          
          doc.setFontSize(10);
          doc.setTextColor(100);
          doc.text('Thank you for your business!', 105, pageHeight - 20, { align: 'center' });
          doc.text('For any inquiries, please contact our office.', 105, pageHeight - 15, { align: 'center' });
        }
      });
      
      // Save the PDF with a timestamp to prevent caching issues
      const timestamp = new Date().getTime();
      doc.save(`invoice-${transactionData.id}-${timestamp}.pdf`);
    };

    const finishProducts = async () => {
      if (!customerName.trim()) {
        alert("Please enter customer name");
        return;
      }

      if (selectedProducts.length === 0) {
        alert("Please add at least one product");
        return;
      }

      try {
        // Create the transaction
        const subtotal = calculateTotal();
        const discountNum = Math.max(0, Math.min(100, Number(discountPercent) || 0));
        const discountAmount = Math.round((subtotal * (discountNum / 100)) * 100) / 100;
        const discountedTotal = Math.round((subtotal - discountAmount) * 100) / 100;

        const docRef = await push(transactionsRef, {
          customerName,
          products: selectedProducts.map((product) => ({
            productId: product.id,
            productName: product.title,
            details: product.details || product.detail || "",
            price: product.price,
          })),
          subtotal,
          discountPercent: discountNum,
          discountAmount,
          total: discountedTotal,
          finishedAt: new Date(),
        });

        // Show a success message when the invoice is saved
        alert('Invoice created successfully!');

        // Attempt to generate and download the PDF; failures here should not affect the success message
        try {
          generateReceiptPDF({
            id: docRef.key,
            customerName,
            products: selectedProducts.map((product) => ({
              productName: product.title,
              details: product.details || product.detail || "",
              price: product.price,
            })),
            finishedAt: new Date(),
            subtotal,
            discountPercent: discountNum,
            discountAmount,
            total: discountedTotal,
          });
        } catch (pdfError) {
          console.error('PDF generation failed:', pdfError);
        }

        // Reset form
        setCustomerName("");
        setSelectedProducts([]);
        setSelectedProductId(null);
      } catch (error) {
        console.error('Error creating invoice:', error);
        alert('Failed to create invoice. Please try again.');
      }
    };

    return (
      <div className="pos-container">
        <h1 className="page-title">Point of Sale</h1>

        <div className="customer-section">
          <div className="customer-input">
            <input
              type="text"
              placeholder="Enter Customer Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          {selectedProducts.length > 0 && (
            <div className="cart-section">
              <h3>Selected Products</h3>
              <div className="cart-items">
                {selectedProducts.map((product) => (
                  <div key={product.timestamp} className="cart-item">
                    <span>
                      {product.title} - ₱{product.price}
                    </span>
                    <button
                      onClick={() => removeProductFromCart(product.timestamp)}
                      className="remove-btn"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <div className="discount-row">
                <label>Discount (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="discount-input"
                />
              </div>

              <div className="cart-total">
                <div>
                  <div>Subtotal: ₱{calculateTotal().toFixed(2)}</div>
                  <div>Discount: {Math.max(0, Math.min(100, Number(discountPercent) || 0))}%</div>
                  <strong>
                    Total: ₱{
                      (Math.round((calculateTotal() - (calculateTotal() * (Math.max(0, Math.min(100, Number(discountPercent) || 0)) / 100))) * 100) / 100).toFixed(2)
                    }
                  </strong>
                </div>
              </div>

              <button className="checkout-btn" onClick={finishProducts}>
                Create Invoice
              </button>
            </div>
          )}
        </div>

        <div className="search-container">
          <input
            type="text"
            placeholder="Search products..."
            className="product-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="products-grid">
          {filteredProducts.length === 0 && (
            <p className="no-results">No products found.</p>
          )}

          {filteredProducts.map((product) => (
            <div
              className={`product-card ${
                product.available ? "available" : "not-available"
              }`}
              key={product.id}
            >
              <h2>{product.title}</h2>
              <p>{product.details}</p>
              <p><strong>Category:</strong> {product.category || 'Uncategorized'}</p>
              <p><strong>Stock:</strong> {product.stock || 0} units</p>
              <p><strong>Price:</strong> ₱{product.price}</p>

              <p className="status">
                Status:
                <span className={product.available ? "green" : "red"}>
                  {product.available ? "Available" : "Not Available"}
                </span>
              </p>

              {product.available && (
                <button
                  className="finish-btn"
                  onClick={() => addProductToCart(product)}
                >
                  Add to Invoice
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
