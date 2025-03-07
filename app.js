import React, { useState, useEffect } from 'react';
import { Calendar, User, Coffee, DollarSign, Plus, X, RefreshCw } from 'lucide-react';

const App = () => {
  // App state
  const [activeTab, setActiveTab] = useState('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [savedData, setSavedData] = useState([]); // To store saved records
  const [monthToDateData, setMonthToDateData] = useState({
    staffCost: 0,
    itemsCost: 0,
    daysRecorded: 0,
    staffPresence: {},
    itemQuantities: {}
  });
  
  // Staff state
  const [staff, setStaff] = useState([
    { id: 1, name: "Staff 1", salary: 5000, shifts: 1, present: true },
    { id: 2, name: "Staff 2", salary: 6000, shifts: 1, present: true },
    { id: 3, name: "Staff 3", salary: 7000, shifts: 1, present: true },
    { id: 4, name: "Cook", salary: 8000, shifts: 2, present: true }
  ]);
  
  // Subscription state
  const [items, setItems] = useState([
    { id: 1, name: "Water", price: 20, unit: "bottles", quantity: 0 },
    { id: 2, name: "Milk", price: 30, unit: "liters", quantity: 0 }
  ]);
  
  // Form state
  const [newStaff, setNewStaff] = useState({ name: '', salary: 0, shifts: 1 });
  const [newItem, setNewItem] = useState({ name: '', price: 0, unit: 'units' });
  
  // Handler functions
  const toggleAttendance = (id) => {
    setStaff(staff.map(s => s.id === id ? { ...s, present: !s.present } : s));
  };
  
  const updateQuantity = (id, change) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, quantity: Math.max(0, item.quantity + change) } : item
    ));
  };
  
  const addStaff = () => {
    if (!newStaff.name) return;
    const newId = staff.length > 0 ? Math.max(...staff.map(s => s.id)) + 1 : 1;
    setStaff([...staff, { ...newStaff, id: newId, present: true }]);
    setNewStaff({ name: '', salary: 0, shifts: 1 });
  };
  
  const removeStaff = (id) => {
    setStaff(staff.filter(s => s.id !== id));
  };
  
  const addItem = () => {
    if (!newItem.name) return;
    const newId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    setItems([...items, { ...newItem, id: newId, quantity: 0 }]);
    setNewItem({ name: '', price: 0, unit: 'units' });
  };
  
  const removeItem = (id) => {
    setItems(items.filter(i => i.id !== id));
  };
  
  // Calculation functions
  const calculateTotalSalary = () => {
    return staff.reduce((total, s) => total + (s.present ? s.salary * s.shifts : 0), 0);
  };
  
  const calculateTotalItemsCost = () => {
    return items.reduce((total, item) => total + (item.quantity * item.price), 0);
  };
  
  // Calculate month-to-date totals
  const calculateMonthToDate = async () => {
    try {
      // In a production app, this would fetch data from Google Sheets
      // For now, we'll use the saved data in state
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      // Filter records for current month
      const monthRecords = savedData.filter(record => {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && 
               recordDate.getFullYear() === currentYear;
      });
      
      // Calculate totals
      let totalStaffCost = 0;
      let totalItemsCost = 0;
      const staffPresence = {};
      const itemQuantities = {};
      
      // Initialize tracking objects
      staff.forEach(s => {
        staffPresence[s.id] = { present: 0, absent: 0 };
      });
      
      items.forEach(item => {
        itemQuantities[item.id] = { total: 0 };
      });
      
      // Process each record
      monthRecords.forEach(record => {
        totalStaffCost += record.totalSalary;
        totalItemsCost += record.totalItemsCost;
        
        // Track staff presence
        record.staff.forEach(s => {
          if (staffPresence[s.id]) {
            if (s.present) {
              staffPresence[s.id].present += 1;
            } else {
              staffPresence[s.id].absent += 1;
            }
          }
        });
        
        // Track item quantities
        record.items.forEach(item => {
          if (itemQuantities[item.id]) {
            itemQuantities[item.id].total += item.quantity;
          }
        });
      });
      
      // Update state with calculated values
      setMonthToDateData({
        staffCost: totalStaffCost,
        itemsCost: totalItemsCost,
        daysRecorded: monthRecords.length,
        staffPresence,
        itemQuantities
      });
      
    } catch (error) {
      console.error("Error calculating month-to-date totals:", error);
    }
  };
  
  // Initialize month-to-date calculation on app load and month change
  useEffect(() => {
    calculateMonthToDate();
  }, [currentDate.getMonth(), savedData]);
  
  // Save data
  const saveData = async () => {
    try {
      const payload = {
        date: currentDate.toISOString(),
        staff,
        items,
        totalSalary: calculateTotalSalary(),
        totalItemsCost: calculateTotalItemsCost()
      };
      
      // Save to Google Sheets via n8n webhook
      await fetch('https://yogesh1993.app.n8n.cloud/webhook-test/95b421cd-50d6-4398-bf44-66ef83a41989', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      // Add to local state for month-to-date calculations
      const newSavedData = [...savedData, payload];
      setSavedData(newSavedData);
      
      // Save to local storage for persistence between sessions
      localStorage.setItem('trackerData', JSON.stringify(newSavedData));
      
      // Recalculate month-to-date totals
      calculateMonthToDate();
      
      alert("Data saved successfully!");
    } catch (error) {
      alert("Error saving data");
    }
  };
  
  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  // Load data from local storage on component mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const storedData = localStorage.getItem('trackerData');
        if (storedData) {
          setSavedData(JSON.parse(storedData));
        }
      } catch (error) {
        console.error("Error loading saved data:", error);
      }
    };
    
    loadSavedData();
  }, []);
  
  return (
    <div className="container mx-auto p-2 max-w-md">
      <h1 className="text-xl font-bold mb-4 text-center">Staff & Item Tracker</h1>
      
      {/* Tab Navigation */}
      <div className="flex mb-4">
        <button 
          className={`flex-1 py-2 flex items-center justify-center ${activeTab === 'daily' ? 'bg-blue-500 text-white font-semibold rounded-t-lg' : 'bg-gray-200 text-gray-700 rounded-t-lg'}`}
          onClick={() => setActiveTab('daily')}
        >
          Daily Tracker
        </button>
        <button 
          className={`flex-1 py-2 flex items-center justify-center ${activeTab === 'staff' ? 'bg-blue-500 text-white font-semibold rounded-t-lg' : 'bg-gray-200 text-gray-700 rounded-t-lg'}`}
          onClick={() => setActiveTab('staff')}
        >
          Staff
        </button>
        <button 
          className={`flex-1 py-2 flex items-center justify-center ${activeTab === 'items' ? 'bg-blue-500 text-white font-semibold rounded-t-lg' : 'bg-gray-200 text-gray-700 rounded-t-lg'}`}
          onClick={() => setActiveTab('items')}
        >
          Items
        </button>
      </div>
      
      {/* Date Selector */}
      <div className="bg-gray-100 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <button 
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={() => {
              const prevDay = new Date(currentDate);
              prevDay.setDate(prevDay.getDate() - 1);
              setCurrentDate(prevDay);
            }}
          >
            ←
          </button>
          <div className="font-semibold text-center flex items-center">
            <Calendar className="mr-2" size={16} />
            {formatDate(currentDate)}
          </div>
          <button 
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={() => {
              const nextDay = new Date(currentDate);
              nextDay.setDate(nextDay.getDate() + 1);
              setCurrentDate(nextDay);
            }}
          >
            →
          </button>
        </div>
      </div>
      
      {/* Daily Tracker Tab */}
      {activeTab === 'daily' && (
        <div className="bg-white p-3 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Staff Attendance</h3>
          
          {/* Attendance Section */}
          <div className="mb-6">
            {staff.map((staffMember) => (
              <div key={staffMember.id} className="flex items-center justify-between py-2 border-b">
                <div className="font-medium">
                  {staffMember.name}
                  {staffMember.shifts > 1 && <span className="ml-1 text-xs bg-blue-100 px-1 rounded">×{staffMember.shifts}</span>}
                </div>
                <button
                  className={`py-1 px-4 rounded ${staffMember.present ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
                  onClick={() => toggleAttendance(staffMember.id)}
                >
                  {staffMember.present ? 'Present' : 'Absent'}
                </button>
              </div>
            ))}
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Items Received</h3>
          
          {/* Items Section */}
          <div className="mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">₹{item.price}/{item.unit}</div>
                </div>
                <div className="flex items-center">
                  <button 
                    className="bg-gray-200 px-2 py-1 rounded-l"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    -
                  </button>
                  <span className="w-12 p-1 border text-center">
                    {item.quantity}
                  </span>
                  <button 
                    className="bg-gray-200 px-2 py-1 rounded-r"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* Summary Section */}
          <div className="mt-4 pt-4 border-t border-gray-300">
            <h3 className="text-lg font-semibold mb-2">Today's Summary</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-sm text-gray-500">Staff Salaries</div>
                <div className="text-xl font-semibold">
                  ₹{calculateTotalSalary().toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <div className="text-sm text-gray-500">Items Cost</div>
                <div className="text-xl font-semibold">
                  ₹{calculateTotalItemsCost().toFixed(2)}
                </div>
              </div>
            </div>
            
            <button 
              onClick={saveData}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-700 mb-4"
            >
              Save Data
            </button>
            
            {/* Month-to-Date Summary */}
            <div className="border-t pt-4 mt-2">
              <h3 className="text-lg font-semibold mb-2">Month-to-Date Summary</h3>
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600">1-{currentDate.getDate()} {currentDate.toLocaleString('default', { month: 'short' })}</span>
                  <button
                    onClick={() => calculateMonthToDate()}
                    className="text-xs px-2 py-1 bg-blue-500 text-white rounded"
                  >
                    Refresh
                  </button>
                </div>
                
                {/* Staff expenses breakdown */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 border-b pb-1 mb-2">Staff Expenses</h4>
                  <div className="space-y-2">
                    {staff.map(staffMember => {
                      const presenceDays = monthToDateData.staffPresence[staffMember.id]?.present || 0;
                      const staffSalary = (staffMember.salary / 30) * presenceDays * staffMember.shifts;
                      return (
                        <div key={staffMember.id} className="flex justify-between text-sm">
                          <div className="flex items-center">
                            <span>{staffMember.name}</span>
                            {staffMember.shifts > 1 && <span className="ml-1 text-xs bg-blue-100 px-1 rounded">×{staffMember.shifts}</span>}
                            <span className="ml-2 text-xs text-gray-500">({presenceDays} days)</span>
                          </div>
                          <span className="font-medium">₹{staffSalary.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-1 border-t font-medium">
                      <span>Total Staff</span>
                      <span>₹{monthToDateData.staffCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Items expenses breakdown */}
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 border-b pb-1 mb-2">Item Expenses</h4>
                  <div className="space-y-2">
                    {items.map(item => {
                      const quantity = monthToDateData.itemQuantities[item.id]?.total || 0;
                      const itemCost = quantity * item.price;
                      return (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <span>{item.name}</span>
                            <span className="ml-2 text-xs text-gray-500">({quantity} {item.unit})</span>
                          </div>
                          <span className="font-medium">₹{itemCost.toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-1 border-t font-medium">
                      <span>Total Items</span>
                      <span>₹{monthToDateData.itemsCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Grand total */}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-400">
                  <span>Grand Total</span>
                  <span>₹{(monthToDateData.staffCost + monthToDateData.itemsCost).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Staff Management Tab */}
      {activeTab === 'staff' && (
        <div className="bg-white p-3 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Add New Staff</h3>
          
          {/* Add Staff Form */}
          <div className="p-3 bg-gray-50 rounded mb-4">
            <input
              type="text"
              placeholder="Staff Name"
              value={newStaff.name}
              onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
              className="p-2 border rounded w-full mb-2"
            />
            <div className="flex items-center mb-2">
              <span className="mr-2">Salary: ₹</span>
              <input
                type="number"
                placeholder="Monthly Salary"
                value={newStaff.salary || ""}
                onChange={(e) => setNewStaff({...newStaff, salary: Number(e.target.value)})}
                className="p-2 border rounded flex-1"
              />
            </div>
            <div className="flex items-center mb-2">
              <span className="mr-2">Shifts:</span>
              <select
                value={newStaff.shifts}
                onChange={(e) => setNewStaff({...newStaff, shifts: Number(e.target.value)})}
                className="p-2 border rounded flex-1"
              >
                <option value={1}>1 shift</option>
                <option value={2}>2 shifts</option>
              </select>
            </div>
            <button
              onClick={addStaff}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" /> Add Staff
            </button>
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Manage Staff</h3>
          
          {/* Staff List */}
          <div className="space-y-2">
            {staff.map((staffMember) => (
              <div key={staffMember.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div className="font-semibold">{staffMember.name}</div>
                  <button
                    onClick={() => removeStaff(staffMember.id)}
                    className="text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <label className="block text-gray-600">Salary (₹)</label>
                    <input
                      type="number"
                      value={staffMember.salary}
                      onChange={(e) => {
                        const newSalary = Number(e.target.value);
                        setStaff(staff.map(s => s.id === staffMember.id ? {...s, salary: newSalary} : s));
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600">Shifts</label>
                    <select
                      value={staffMember.shifts}
                      onChange={(e) => {
                        const newShifts = Number(e.target.value);
                        setStaff(staff.map(s => s.id === staffMember.id ? {...s, shifts: newShifts} : s));
                      }}
                      className="w-full p-1 border rounded"
                    >
                      <option value={1}>1 shift</option>
                      <option value={2}>2 shifts</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Salary Calculator */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <DollarSign size={18} className="mr-1" /> Salary Calculator
            </h3>
            <div className="space-y-2">
              {staff.map((staffMember) => (
                <div key={staffMember.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <div>{staffMember.name}</div>
                    <div className="text-xs text-gray-500">
                      {staffMember.shifts > 1 && <span className="mr-1">{staffMember.shifts} shifts</span>}
                    </div>
                  </div>
                  <div className="font-semibold">₹{(staffMember.salary * staffMember.shifts).toFixed(2)}</div>
                </div>
              ))}
              <div className="pt-2 flex justify-between items-center font-bold">
                <div>Total</div>
                <div>₹{staff.reduce((sum, s) => sum + (s.salary * s.shifts), 0).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Items Management Tab */}
      {activeTab === 'items' && (
        <div className="bg-white p-3 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Add New Item</h3>
          
          {/* Add Item Form */}
          <div className="p-3 bg-gray-50 rounded mb-4">
            <input
              type="text"
              placeholder="Item Name"
              value={newItem.name}
              onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              className="p-2 border rounded w-full mb-2"
            />
            <div className="flex items-center mb-2">
              <span className="mr-2">Price: ₹</span>
              <input
                type="number"
                placeholder="Price per Unit"
                value={newItem.price || ""}
                onChange={(e) => setNewItem({...newItem, price: Number(e.target.value)})}
                className="p-2 border rounded flex-1"
              />
            </div>
            <div className="flex items-center mb-2">
              <span className="mr-2">Unit:</span>
              <select
                value={newItem.unit}
                onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                className="p-2 border rounded flex-1"
              >
                <option value="units">units</option>
                <option value="bottles">bottles</option>
                <option value="liters">liters</option>
                <option value="grams">grams</option>
                <option value="kilos">kilos</option>
                <option value="packets">packets</option>
              </select>
            </div>
            <button
              onClick={addItem}
              className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700 flex items-center justify-center"
            >
              <Plus size={16} className="mr-1" /> Add Item
            </button>
          </div>
          
          <h3 className="text-lg font-semibold mb-3">Manage Items</h3>
          
          {/* Items List */}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="p-3 border rounded">
                <div className="flex justify-between">
                  <div className="font-semibold">{item.name}</div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-500"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                  <div>
                    <label className="block text-gray-600">Price (₹)</label>
                    <input
                      type="number"
                      value={item.price}
                      onChange={(e) => {
                        const newPrice = Number(e.target.value);
                        setItems(items.map(i => i.id === item.id ? {...i, price: newPrice} : i));
                      }}
                      className="w-full p-1 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-600">Unit</label>
                    <select
                      value={item.unit}
                      onChange={(e) => {
                        setItems(items.map(i => i.id === item.id ? {...i, unit: e.target.value} : i));
                      }}
                      className="w-full p-1 border rounded"
                    >
                      <option value="units">units</option>
                      <option value="bottles">bottles</option>
                      <option value="liters">liters</option>
                      <option value="grams">grams</option>
                      <option value="kilos">kilos</option>
                      <option value="packets">packets</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Items Cost Calculator */}
          <div className="mt-6 pt-4 border-t border-gray-300">
            <h3 className="text-lg font-semibold mb-2 flex items-center">
              <Coffee size={18} className="mr-1" /> Items Cost Summary
            </h3>
            <div className="p-3 border rounded">
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-1 border-b text-sm">
                    <div>{item.name}</div>
                    <div>₹{item.price} per {item.unit}</div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-4 text-gray-500">
                Enter quantities in the Daily Tracker tab to calculate costs
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
