import { useEffect, useState, useCallback } from "react";
import { db } from "../firebase";
import { ref, onValue, get, child } from "firebase/database";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import DatePicker from "react-datepicker";
import { format, subDays, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isAfter, isBefore } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [totalProducts, setTotalProducts] = useState(0);
  const [availableProducts, setAvailableProducts] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [netIncome, setNetIncome] = useState(0);

  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [dateRange, setDateRange] = useState('monthly'); // daily, weekly, monthly, custom
  const [filteredIncome, setFilteredIncome] = useState(0);
  const [startDate, setStartDate] = useState(startOfDay(subDays(new Date(), 30)));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [isLoading, setIsLoading] = useState(true);
  const [dailyProductCounts, setDailyProductCounts] = useState({});
  const [totalProductsToday, setTotalProductsToday] = useState(0);
  const [showProductModal, setShowProductModal] = useState(false);

  const productsRef = ref(db, "products");
  const transactionsRef = ref(db, "transactions");
  const expensesRef = ref(db, "expenses");

  useEffect(() => {
    // Products listener
    const unsubscribeProducts = onValue(productsRef, (snapshot) => {
      const productsData = snapshot.val() || {};
      const productsList = Object.keys(productsData).map(key => ({
        id: key,
        ...productsData[key]
      }));
      setTotalProducts(productsList.length);
      setAvailableProducts(productsList.filter(p => p.available).length);
    });

    // Transactions listener
    const unsubscribeTransactions = onValue(transactionsRef, (snapshot) => {
      const transactionsData = snapshot.val() || {};
      const txList = Object.keys(transactionsData).map(key => ({
        id: key,
        ...transactionsData[key]
      }));

      // Filter transactions by date range
      const filteredTxList = txList.filter(tx => {
        if (!tx.finishedAt) return false;
        const txDate = new Date(tx.finishedAt);
        return txDate >= startDate && txDate <= endDate;
      });

      setTransactions(filteredTxList);

      const getTxTotal = (tx) => {
        if (typeof tx.total === 'number') return tx.total;
        if (tx.total) return Number(tx.total) || 0;
        if (Array.isArray(tx.products)) {
          return tx.products.reduce((s, item) => s + (Number(item.price) || 0), 0);
        }
        return 0;
      };

      const revenue = filteredTxList.reduce((sum, tx) => sum + getTxTotal(tx), 0);
      setTotalRevenue(revenue);

      // Calculate product counts for today only
      const today = new Date();
      const todayStart = startOfDay(today);
      const todayEnd = endOfDay(today);
      const productCounts = {};
      let todayProducts = 0;

      filteredTxList.forEach(tx => {
        if (Array.isArray(tx.products)) {
          const txDate = new Date(tx.finishedAt);
          
          // Only process transactions from today
          if (txDate >= todayStart && txDate <= todayEnd) {
            tx.products.forEach(product => {
              const productName = product.productName || product.title || 'Unknown Product';
              productCounts[productName] = (productCounts[productName] || 0) + 1;
              todayProducts++;
            });
          }
        }
      });

      setDailyProductCounts(productCounts);
      setTotalProductsToday(todayProducts);
    });

    // Expenses listener
    const unsubscribeExpenses = onValue(expensesRef, (snapshot) => {
      const expensesData = snapshot.val() || {};
      const expensesList = Object.keys(expensesData).map(key => ({
        id: key,
        ...expensesData[key]
      }));

      // Filter expenses by date range
      const filteredExpensesList = expensesList.filter(exp => {
        if (!exp.date) return false;
        const expDate = new Date(exp.date);
        return expDate >= startDate && expDate <= endDate;
      });

      const expensesTotal = filteredExpensesList.reduce(
        (sum, exp) => sum + Number(exp.amount || 0),
        0
      );

      setTotalExpenses(expensesTotal);
    });

    // Cleanup function to unsubscribe from listeners
    return () => {
      unsubscribeProducts();
      unsubscribeTransactions();
      unsubscribeExpenses();
    };
  }, [startDate, endDate]); // Re-run effect when dates change

  useEffect(() => {
    setNetIncome(totalRevenue - totalExpenses);
  }, [totalRevenue, totalExpenses]);

  // -----------------------------------------
  // FILTERING FUNCTIONS (Daily / Weekly / Monthly)
  // -----------------------------------------
  const parseTimestamp = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp);
  };

  const groupByDay = useCallback((txList) => {
    const map = new Map();
    
    txList.forEach(tx => {
      const date = parseTimestamp(tx.finishedAt);
      if (!date) return;

      const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      const tTotal = (typeof tx.total === 'number') ? tx.total : (Number(tx.total) || (Array.isArray(tx.products) ? tx.products.reduce((s, i) => s + (Number(i.price) || 0), 0) : 0));
      map.set(dateKey, (map.get(dateKey) || 0) + tTotal);
    });

    // Sort by date
    return Array.from(map.entries())
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([label, revenue]) => ({ label, revenue }));
  }, []);

  const groupByWeek = useCallback((txList) => {
    const map = new Map();
    
    txList.forEach(tx => {
      const date = parseTimestamp(tx.finishedAt);
      if (!date) return;

      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start week on Monday
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const tTotal = (typeof tx.total === 'number') ? tx.total : (Number(tx.total) || (Array.isArray(tx.products) ? tx.products.reduce((s, i) => s + (Number(i.price) || 0), 0) : 0));

      const weekKey = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      map.set(weekKey, (map.get(weekKey) || 0) + tTotal);
    });

    // Sort by week start date
    return Array.from(map.entries())
      .sort(([a], [b]) => new Date(a.split(' - ')[0]) - new Date(b.split(' - ')[0]))
      .map(([label, revenue]) => ({ label, revenue }));
  }, []);

  const groupByMonth = useCallback((txList) => {
    const map = new Map();
    
    txList.forEach(tx => {
      const date = parseTimestamp(tx.finishedAt);
      if (!date) return;

      const tTotal = (typeof tx.total === 'number') ? tx.total : (Number(tx.total) || (Array.isArray(tx.products) ? tx.products.reduce((s, i) => s + (Number(i.price) || 0), 0) : 0));

      const monthKey = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      map.set(monthKey, (map.get(monthKey) || 0) + tTotal);
    });

    // Sort by month
    return Array.from(map.entries())
      .sort(([a], [b]) => new Date(a) - new Date(b))
      .map(([label, revenue]) => ({ label, revenue }));
  }, []);

  // -----------------------------------------
  // Format individual transactions for the chart
  const formatTransactionData = useCallback((txList) => {
    return txList
      .map(tx => {
        const date = parseTimestamp(tx.finishedAt);
        if (!date) return null;
        const tTotal = (typeof tx.total === 'number') ? tx.total : (Number(tx.total) || (Array.isArray(tx.products) ? tx.products.reduce((s, i) => s + (Number(i.price) || 0), 0) : 0));
        return {
          date,
          label: format(date, 'MMM d, yyyy HH:mm'),
          revenue: tTotal || 0,
          service: Array.isArray(tx.products) ? tx.products.map(s => s.productName || s.title).join(', ') : (tx.productName || 'Product'),
          customer: tx.customerName || 'Customer'
        };
      })
      .filter(Boolean) // Remove any null entries
      .sort((a, b) => a.date - b.date); // Sort by date
  }, []);

  // Update chart when date range or transactions change
  useEffect(() => {
    if (transactions.length === 0) {
      setChartData([]);
      setFilteredIncome(0);
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedData = formatTransactionData(transactions);
      const total = formattedData.reduce((sum, d) => sum + (d.revenue || 0), 0);
      
      setChartData(formattedData);
      setFilteredIncome(total);
    } catch (error) {
      console.error('Error processing chart data:', error);
      setChartData([]);
      setFilteredIncome(0);
    } finally {
      setIsLoading(false);
    }
  }, [transactions, formatTransactionData]);

  // Handle date range preset selection
  const handleRangeChange = (range) => {
    const today = new Date();
    let newStartDate = startDate;
    let newEndDate = endDate;
    
    switch (range) {
      case 'daily':
        newStartDate = startOfDay(today);
        newEndDate = endOfDay(today);
        break;
      case 'weekly':
        newStartDate = startOfWeek(today, { weekStartsOn: 1 });
        newEndDate = endOfDay(today);
        break;
      case 'monthly':
        newStartDate = startOfMonth(today);
        newEndDate = endOfDay(today);
        break;
      default:
        return; // Keep existing dates for 'custom' range
    }
    
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setDateRange(range);
  };

  // Handle start date change
  const handleStartDateChange = (date) => {
    if (!date) return;
    const newStart = startOfDay(new Date(date));
    setStartDate(newStart);
    
    // If end date is before new start date, update end date to be the same as start date
    if (isBefore(endDate, newStart)) {
      setEndDate(endOfDay(newStart));
    }
    
    setDateRange('custom');
  };

  // Handle end date change
  const handleEndDateChange = (date) => {
    if (!date) return;
    const newEnd = endOfDay(new Date(date));
    setEndDate(newEnd);
    
    // If start date is after new end date, update start date to be the same as end date
    if (isAfter(startDate, newEnd)) {
      setStartDate(startOfDay(newEnd));
    }
    
    setDateRange('custom');
  };
  
  // Format date for display in the date picker inputs
  const formatDateForInput = (date) => {
    return date ? format(date, 'MMM d, yyyy') : '';
  };

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      <div className="stats-grid">

        <div className="stat-card">
          <h2>Total Products</h2>
          <p className="stat-number">{totalProducts}</p>
        </div>

        <div className="stat-card available">
          <h2>Available Products</h2>
          <p className="stat-number">{availableProducts}</p>
        </div>

        <div className="stat-card revenue">
          <h2>Total Revenue</h2>
          <p className="stat-number">₱{totalRevenue.toLocaleString()}</p>
        </div>

        <div className="stat-card net">
          <h2>Net Income</h2>
          <p className="stat-number">₱{netIncome.toLocaleString()}</p>
        </div>

        <div className="stat-card expenses">
          <h2>Total Expenses</h2>
          <p className="stat-number">₱{totalExpenses.toLocaleString()}</p>
        </div>

        <div className="stat-card products" onClick={() => setShowProductModal(true)} style={{ cursor: 'pointer' }}>
          <h2>Products Today</h2>
          <p className="stat-number">{totalProductsToday}</p>
          <p className="view-details">Click to view details</p>
        </div>

      </div>

      {/* ------------------------------ */}
      {/*   Income Summary with Date Range Picker */}
      {/* ------------------------------ */}
      <div className="income-filter">
        <div className="date-range-picker-container">
          <h2>Income Summary</h2>
          <div className="date-range-selector">
            <div className="date-range-buttons">
              <button 
                type="button" 
                className={`date-range-btn ${dateRange === 'daily' ? 'active' : ''}`}
                onClick={() => handleRangeChange('daily')}
              >
                Today
              </button>
              <button 
                type="button" 
                className={`date-range-btn ${dateRange === 'weekly' ? 'active' : ''}`}
                onClick={() => handleRangeChange('weekly')}
              >
                This Week
              </button>
              <button 
                type="button" 
                className={`date-range-btn ${dateRange === 'monthly' ? 'active' : ''}`}
                onClick={() => handleRangeChange('monthly')}
              >
                Last 30 Days
              </button>
            </div>
            <div className="date-range-pickers">
              <div className="date-picker-group">
                <label>From:</label>
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  className="date-picker-input"
                  dateFormat="MMM d, yyyy"
                  maxDate={endDate || new Date()}
                  placeholderText="Start date"
                  value={formatDateForInput(startDate)}
                />
              </div>
              <div className="date-picker-separator">to</div>
              <div className="date-picker-group">
                <label>To:</label>
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  className="date-picker-input"
                  dateFormat="MMM d, yyyy"
                  minDate={startDate}
                  maxDate={new Date()}
                  placeholderText="End date"
                  value={formatDateForInput(endDate)}
                />
              </div>
            </div>
          </div>
          <p className="filtered-income-value">
            {startDate && endDate ? (
              <span>
                Income from <strong>{format(startDate, 'MMM d, yyyy')}</strong> to{' '}
                <strong>{format(endDate, 'MMM d, yyyy')}</strong>:
              </span>
            ) : (
              <span>Select a date range to view income</span>
            )}
            <strong> ₱{filteredIncome.toLocaleString()}</strong>
          </p>
        </div>
      </div>

      {/* ------------------------------ */}
      {/* Revenue Chart */}
      {/* ------------------------------ */}
      <div className="revenue-chart-container">
        <h2>Transaction History</h2>
        <p className="chart-subtitle">
          Showing all transactions from {format(startDate, 'MMM d, yyyy')} to {format(endDate, 'MMM d, yyyy')}
        </p>

        {isLoading ? (
          <div className="chart-loading">Loading transactions...</div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 30, bottom: 80 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="label"
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 10 }}
                interval={0} // Show all labels
                tickFormatter={(value, index) => {
                  // Show time for better readability when there are many points
                  if (chartData.length > 10) {
                    return format(new Date(chartData[index]?.date || new Date()), 'HH:mm');
                  }
                  return value;
                }}
              />
              <YAxis 
                tickFormatter={(value) => `₱${value.toLocaleString()}`}
                tick={{ fontSize: 10 }}
              />
              <Tooltip 
                formatter={(value) => [`₱${value.toLocaleString()}`, 'Amount']}
                labelFormatter={(label, payload) => {
                  if (!payload || !payload[0]) return label;
                  return [
                    `Date: ${label}`,
                    `Service: ${payload[0].payload.service}`,
                    `Customer: ${payload[0].payload.customer}`,
                    `Amount: ₱${payload[0].payload.revenue.toLocaleString()}`,
                    `Daily Services: ${payload[0].payload.dailyServices}`
                  ].join('<br/>');
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e0e0e0',
                  borderRadius: '4px',
                  padding: '10px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Amount"
                stroke="#003d7a"
                strokeWidth={2}
                dot={{ r: 4, fill: '#003d7a' }}
                activeDot={{ r: 6, fill: '#ff6b6b' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="no-transactions">No transactions found in the selected date range.</div>
        )}
      </div>

      {/* Product Details Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={() => setShowProductModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Product Breakdown - {new Date().toLocaleDateString()}</h2>
              <button className="close-button" onClick={() => setShowProductModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {Object.keys(dailyProductCounts).length > 0 ? (
                <div className="product-list">
                  {Object.entries(dailyProductCounts)
                    .sort((a, b) => b[1] - a[1]) // Sort by count descending
                    .map(([product, count]) => (
                      <div key={product} className="product-item">
                        <span className="product-name">{product}</span>
                        <span className="product-count">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p>No products recorded for today.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="close-btn" onClick={() => setShowProductModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          width: 90%;
          max-width: 500px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e0e0e0;
        }
        .modal-header h2 {
          margin: 0;
          font-size: 1.5rem;
          color: #333;
        }
        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
        }
        .product-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .product-item {
          display: flex;
          justify-content: space-between;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          transition: background-color 0.2s;
        }
        .product-item:hover {
          background: #e9ecef;
        }
        .product-name {
          font-weight: 500;
          color: #333;
        }
        .product-count {
          background: #9C27B0;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
        }
        .modal-footer {
          margin-top: 20px;
          text-align: right;
        }
        .close-btn {
          background: #9C27B0;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
        }
        .close-btn:hover {
          background: #7B1FA2;
        }
        .view-details {
          font-size: 0.8rem;
          margin-top: 5px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
}
