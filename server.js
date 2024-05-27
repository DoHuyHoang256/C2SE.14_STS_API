const express = require('express');
const { config } = require('dotenv');
const pg = require('pg');
const cors = require('cors');
const moment = require('moment-timezone');

const app = express();

app.use(cors());
app.use(express.json());

config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true
})

app.get('/api/users/email', (req, res) => {
    pool.query('SELECT email FROM users', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const emails = result.rows.map(row => row.email);
        res.json(emails);
      }
    });
  });

  app.get('/api/users/emailSecurity', (req, res) => {
    pool.query('SELECT email FROM users WHERE role = 2', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        const emails = result.rows.map(row => row.email);
        res.json(emails);
      }
    });
});

app.get('/api/users/emailAdmin', (req, res) => {
  pool.query('SELECT email FROM users WHERE role = 1', (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const emails = result.rows.map(row => row.email);
      res.json(emails);
    }
  });
});

  
  app.get('/api/users/email/:email', (req, res) => {
    const email = req.params.email;

    // Truy vấn cơ sở dữ liệu để lấy thông tin của người dùng từ email
    pool.query('SELECT * FROM users WHERE email = $1', [email], (error, result) => {
        if (error) {
            console.error('Lỗi thực thi truy vấn:', error);
            res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        } else {
            if (result.rows.length > 0) {
                res.json(result.rows[0]);
            } else {
                res.status(404).json({ message: 'Không tìm thấy người dùng với email đã cho' });
            }
        }
    });
});


  
  // API endpoint để lấy role_name từ role_id
  app.get('/api/roleName/:roleId', (req, res) => {
    const roleId = req.params.roleId;
  
    // Truy vấn cơ sở dữ liệu để lấy role_name từ role_id
    pool.query('SELECT role_name FROM role WHERE role_id = $1', [roleId], (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (result.rows.length > 0) {
          res.json({ role_name: result.rows[0].role_name });
        } else {
          res.status(404).json({ message: 'Role not found' });
        }
      }
    });
  });
  
  // API endpoint để lấy danh sách vai trò từ bảng role
  app.get('/api/roles', (req, res) => {
    // Truy vấn cơ sở dữ liệu để lấy tất cả các vai trò
    pool.query('SELECT * FROM role', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result.rows);
      }
    });
  });
  
  //endpoint API để lấy tất cả dữ liệu từ bảng "gender"
  app.get('/api/gender', (req, res) => {
    pool.query('SELECT * FROM gender', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result.rows);
      }
    });
  });
  
  
  // API endpoint to insert new user
  app.post('/api/users', (req, res) => {
    // Check if req.body exists
    if (!req.body) {
        return res.status(400).json({ error: 'Yêu cầu không có dữ liệu' });
    }

    const { full_name, email, bienso, gender, phone_number, address } = req.body;

    // Kiểm tra xem tất cả các trường bắt buộc đã được cung cấp chưa
    if (!full_name || !email || !bienso || !gender || !phone_number || !address) {
        return res.status(400).json({ error: 'Vui lòng cung cấp tất cả các trường bắt buộc: full_name, email, bienso, gender, phone_number, address' });
    }

    // Tạo token ngẫu nhiên
    const token = generateRandomToken();

    // Chèn người dùng mới vào cơ sở dữ liệu mà không chỉ định user_id
    pool.query('INSERT INTO users (full_name, email, user_code, gender, phone_number, address, role, wallet, token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [full_name, email, bienso, gender, phone_number, address, 3, 0, token],
        (error, result) => {
            if (error) {
                console.error('Lỗi thực thi truy vấn:', error);
                return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
            } else {
                res.status(201).json(result.rows[0]);
            }
        }
    );
});

app.post('/api/usersAdmin', (req, res) => {
  // Check if req.body exists
  if (!req.body) {
      return res.status(400).json({ error: 'Yêu cầu không có dữ liệu' });
  }

  const { full_name, email, gender, phone_number, address, role } = req.body;

  // Kiểm tra xem tất cả các trường bắt buộc đã được cung cấp chưa
  if (!full_name || !email || !gender || !phone_number || !address || !role ) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tất cả các trường bắt buộc: full_name, email, gender, phone_number, address' });
  }

  // Tạo token ngẫu nhiên
  const token = generateRandomToken();

  // Chèn người dùng mới vào cơ sở dữ liệu mà không chỉ định user_id
  pool.query('INSERT INTO users (full_name, email, gender, phone_number, address, role, wallet, token) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [full_name, email, gender, phone_number, address, role, 0, token],
      (error, result) => {
          if (error) {
              console.error('Lỗi thực thi truy vấn:', error);
              return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
          } else {
              res.status(201).json(result.rows[0]);
          }
      }
  );
});

// Hàm tạo token ngẫu nhiên
function generateRandomToken() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 8;
    let token = '';
    for (let i = 0; i < length; i++) {
        token += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return token;
}


app.get('/api/allInfo', (req, res) => {
  const page = req.query.page || 1; // Trang hiện tại, mặc định là 1 nếu không có tham số được cung cấp
  const pageSize = req.query.pageSize || 10; // Kích thước trang, mặc định là 10 nếu không có tham số được cung cấp
  const offset = (page - 1) * pageSize; // Số lượng bỏ qua, dựa trên trang hiện tại và kích thước trang

  pool.query('SELECT * FROM users ORDER BY user_id LIMIT $1 OFFSET $2', [pageSize, offset], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.rows);
    }
  });
});



  // API endpoint để lấy thông tin của một user từ cơ sở dữ liệu dựa trên userId
  app.get('/api/users/:userId', (req, res) => {
    const userId = req.params.userId;
  
    // Truy vấn cơ sở dữ liệu để lấy thông tin của user từ userId
    pool.query('SELECT * FROM users WHERE user_id = $1', [userId], (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        if (result.rows.length > 0) {
          res.json(result.rows[0]);
        } else {
          res.status(404).json({ message: 'User not found' });
        }
      }
    });
  });
  
  const removeDiacritics = (str) => {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };
  
  app.get('/api/search', (req, res) => {
    const searchTerm = req.query.searchTerm || ''; // Chuỗi tìm kiếm, mặc định là chuỗi trống nếu không có giá trị được cung cấp
    const page = req.query.page || 1; // Trang hiện tại, mặc định là 1 nếu không có tham số được cung cấp
    const pageSize = req.query.pageSize || 10; // Kích thước trang, mặc định là 10 nếu không có tham số được cung cấp
    const offset = (page - 1) * pageSize; // Số lượng bỏ qua, dựa trên trang hiện tại và kích thước trang
  
    const query = `
      SELECT * 
      FROM users 
      WHERE full_name ILIKE $1 OR email ILIKE $1 
      ORDER BY user_id 
      LIMIT $2 OFFSET $3
    `;
  
    pool.query(
      query,
      [`%${searchTerm}%`, pageSize, offset],
      (error, result) => {
        if (error) {
          console.error('Error executing query:', error);
          res.status(500).json({ error: 'Internal Server Error' });
        } else {
          res.json(result.rows);
        }
      }
    );
  });
  
  
  
  
  // API endpoint to delete user by user_id
  app.delete('/api/users/:user_id', (req, res) => {
    const userId = req.params.user_id;
  
    // Check if userId is provided
    if (!userId) {
      return res.status(400).json({ error: 'Vui lòng cung cấp user_id' });
    }
  
    // Delete user from the database based on user_id
    pool.query('DELETE FROM users WHERE user_id = $1', [userId], (error, result) => {
      if (error) {
        console.error('Lỗi thực thi truy vấn:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
      } else {
        if (result.rowCount > 0) {
          res.json({ message: 'Người dùng đã được xóa thành công' });
        } else {
          res.status(404).json({ message: 'Không tìm thấy người dùng' });
        }
      }
    });
  });
  
  
  // API endpoint to retrieve all transactions
  app.get('/api/transactions', (req, res) => {
    pool.query('SELECT * FROM transactionhistory', (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result.rows);
      }
    });
  });

  // Utility function to format date
function formatDate(dateString) {
  if (!dateString) return null;
  const options = { 
    day: '2-digit', month: '2-digit', year: 'numeric', 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  };
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', options).format(date).replace(',', '');
}

function formatDate(date) {
  if (!date) return null;
  const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' };
  return new Date(date).toLocaleString('vn-VN', options);
}

  
app.get('/api/transaction-history/:userId', (req, res) => {
  const userId = req.params.userId;

  // Query the database to get transaction history information based on userId
  pool.query(`
    SELECT 
      users.full_name,
      users.wallet,
      transactionhistory.transaction_id,
      transactionhistory.user_id,
      transactionhistory.transaction_type,
      transactionhistory.check_time,
      transactionhistory.amount,
      transactionhistory.tran_time,
      location.location_name AS location,
      CASE WHEN transactionhistory.check_time IS NOT NULL THEN checkincheckout.license_plate ELSE NULL END AS license_plate,
      CASE WHEN transactionhistory.check_time IS NOT NULL THEN checkincheckout.checkin_time ELSE NULL END AS checkin_time,
      CASE WHEN transactionhistory.check_time IS NOT NULL THEN checkincheckout.checkout_time ELSE NULL END AS checkout_time
    FROM 
      users
    INNER JOIN 
      transactionhistory ON users.user_id = transactionhistory.user_id
    INNER JOIN
      location ON transactionhistory.location = location.location_id
    LEFT JOIN
      checkincheckout ON transactionhistory.check_time = checkincheckout.check_id
    WHERE 
      users.user_id = $1
    ORDER BY 
      transactionhistory.tran_time DESC
  `, [userId], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const formattedResult = result.rows.map(row => ({
        ...row,
        tran_time: formatDate(row.tran_time),
        checkin_time: formatDate(row.checkin_time),
        checkout_time: formatDate(row.checkout_time)
      }));
      res.json(formattedResult);
    }
  });
});


  
  // API endpoint để thêm một transaction mới
  app.post('/api/deposit', (req, res) => {
    // Check if req.body exists
    if (!req.body) {
        return res.status(400).json({ error: 'Yêu cầu không có dữ liệu' });
    }

    const { user_id, amount, tran_time } = req.body;
    const transaction_type = 1; // Đặt transaction_type mặc định là 1
    const location = 1;

    // Check if all required fields are provided
    if (!user_id|| !amount || !tran_time) {
        return res.status(400).json({ error: 'Vui lòng cung cấp tất cả các trường bắt buộc: user_id, amount, tran_time' });
    }

    // Insert new transaction into the database without specifying transaction_id
    pool.query('INSERT INTO transactionhistory (user_id, transaction_type, amount, tran_time, location) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
    [user_id, transaction_type, amount, tran_time, location], 
    (error, result) => {
        if (error) {
            console.error('Lỗi thực thi truy vấn:', error);
            return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
        } else {
            // Cộng số tiền amount vào wallet trong bảng users
            pool.query('UPDATE users SET wallet = wallet + $1 WHERE user_id = $2', 
            [amount, user_id], 
            (error, result) => {
                if (error) {
                    console.error('Lỗi thực thi truy vấn:', error);
                    return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
                } else {
                    res.status(201).json(result.rows[0]);
                }
            });
        }
    });
});


// API endpoint để lấy tất cả dữ liệu từ bảng "location"
app.get('/api/locations', (req, res) => {
  pool.query('SELECT location.*, users.email, CASE WHEN location.status = true THEN \'Đang hoạt động\' ELSE \'Ngưng hoạt động\' END AS status_text FROM location INNER JOIN users ON location.user_id = users.user_id', (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.rows);
    }
  });
});

// API endpoint để thêm một địa điểm mới
app.post('/api/locations', (req, res) => {
  // Check if req.body exists
  if (!req.body) {
      return res.status(400).json({ error: 'Yêu cầu không có dữ liệu' });
  }

  const { name, account, cost, note } = req.body;

  // Check if all required fields are provided
  if (!name || !account || !cost) {
      return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin' });
  }

  let noteValue = note; // Initialize noteValue with the provided note

  // If note is empty or undefined, set it to null
  if (!noteValue) {
      noteValue = null;
  }

  // Insert new location into the database
  pool.query(
      'INSERT INTO location (location_name, status, user_id, cost, note) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, true, account, cost, noteValue], // Use noteValue for the note field
      (error, result) => {
          if (error) {
              console.error('Lỗi thực thi truy vấn:', error);
              return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
          } else {
              res.status(201).json(result.rows[0]);
          }
      }
  );
});


// API endpoint để xóa các dòng từ bảng location có location_id trong mảng selectedLocations
app.delete('/api/locations', (req, res) => {
  const selectedLocations = req.body.selectedLocations; // Lấy mảng các location_id từ body của yêu cầu

  // Kiểm tra xem selectedLocations có tồn tại không
  if (!selectedLocations || selectedLocations.length === 0) {
      return res.status(400).json({ error: 'Không có location nào được chọn để xóa' });
  }

  // Xây dựng câu truy vấn DELETE với điều kiện WHERE location_id IN (...)
  const query = 'DELETE FROM location WHERE location_id IN (' + selectedLocations.join(',') + ')';

  // Thực thi câu truy vấn DELETE
  pool.query(query, (error, result) => {
      if (error) {
          console.error('Lỗi thực thi truy vấn:', error);
          return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
      } else {
          const rowCount = result.rowCount; // Số dòng bị ảnh hưởng bởi câu truy vấn DELETE
          res.json({ message: `Đã xóa ${rowCount} location thành công` });
      }
  });
});



app.get('/api/transactions/count', async (req, res) => {
  const { startDate, endDate } = req.query;

  // Khai báo mảng params
  let params = [];

  // Xây dựng câu truy vấn SQL dựa trên các tham số được cung cấp
  let query = `
    SELECT 
      l.location_name,
      DATE(th.tran_time) AS transaction_date, 
      COUNT(*) AS total_transactions 
    FROM 
      transactionhistory th
    INNER JOIN
      location l ON th.location = l.location_id
    WHERE 
      th.transaction_type = 2
  `;

  // Thêm điều kiện lọc theo khoảng thời gian nếu startDate và endDate được cung cấp
  if (startDate && endDate) {
    query += ` AND DATE(th.tran_time) BETWEEN $1 AND $2`;
    params.push(startDate);
    params.push(endDate);
  }

  // Nhóm kết quả theo ngày và location_name
  query += ` GROUP BY l.location_name, DATE(th.tran_time)`;

  // Thực thi truy vấn
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/checkincheckout', (req, res) => {
  const { startDate, endDate } = req.query;

  // Kiểm tra xem startDate và endDate có tồn tại không
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Vui lòng cung cấp startDate và endDate' });
  }

  // Truy vấn cơ sở dữ liệu để lấy thông tin từ bảng checkincheckout, transactionhistory, location và users
  const query = `
    SELECT 
      users.full_name,
      cc.license_plate, 
      cc.checkin_time, 
      cc.checkout_time,
      location.location_name
    FROM 
      checkincheckout cc
    INNER JOIN 
      transactionhistory th ON cc.check_id = th.check_time
    INNER JOIN 
      location ON th.location = location.location_id
    INNER JOIN 
      users ON th.user_id = users.user_id
    WHERE 
      DATE(th.tran_time) BETWEEN $1 AND $2;
  `;
  
  // Thực hiện truy vấn SQL với tham số startDate và endDate
  pool.query(query, [startDate, endDate], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.rows);
    }
  });
});


app.get('/api/transaction-summary', (req, res) => {
  const { startDate, endDate } = req.query;

  // Kiểm tra xem startDate và endDate có tồn tại không
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Vui lòng cung cấp startDate và endDate' });
  }

  // Truy vấn cơ sở dữ liệu để lấy thông tin từ các bảng
  const query = `
    SELECT 
      users.full_name, 
      checkincheckout.license_plate,
      location.location_name,
      transactionhistory.tran_time,
      SUM(transactionhistory.amount) AS amount
    FROM 
      transactionhistory
    INNER JOIN 
      users ON transactionhistory.user_id = users.user_id
    INNER JOIN 
      checkincheckout ON transactionhistory.check_time = checkincheckout.check_id
    INNER JOIN
      location ON transactionhistory.location = location.location_id
    WHERE 
      transactionhistory.transaction_type = 2 AND 
      DATE(transactionhistory.tran_time) BETWEEN $1 AND $2
    GROUP BY 
      users.full_name, 
      checkincheckout.license_plate,
      location.location_name,
      transactionhistory.tran_time;
  `;

  // Thực hiện truy vấn SQL với tham số startDate và endDate
  pool.query(query, [startDate, endDate], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.rows);
    }
  });
});

app.get('/api/total-amount-by-location', (req, res) => {
  const { startDate, endDate } = req.query;

  // Kiểm tra xem startDate và endDate có tồn tại không
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Vui lòng cung cấp startDate và endDate' });
  }

  // Truy vấn cơ sở dữ liệu để lấy tổng số lượng amount theo từng location_name và ngày
  const query = `
    SELECT 
      location.location_name,
      DATE(transactionhistory.tran_time) AS transaction_date,
      SUM(transactionhistory.amount) AS total_amount
    FROM 
      transactionhistory
    INNER JOIN 
      location ON transactionhistory.location = location.location_id
    WHERE 
      transactionhistory.transaction_type = 2
      AND DATE(transactionhistory.tran_time) BETWEEN $1 AND $2
    GROUP BY 
      location.location_name, DATE(transactionhistory.tran_time)
    ORDER BY 
      location.location_name, DATE(transactionhistory.tran_time);
  `;
  
  // Thực hiện truy vấn SQL với tham số startDate và endDate
  pool.query(query, [startDate, endDate], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      // Xử lý kết quả trả về từ cơ sở dữ liệu
      const formattedResult = [];
      result.rows.forEach(row => {
        const { location_name, transaction_date, total_amount } = row;
        formattedResult.push({
          location_name,
          date: transaction_date,
          total: total_amount
        });
      });
      res.json(formattedResult);
    }
  });
});


app.get('/api/user-info/:email', (req, res) => {
  const { email } = req.params;

  // Truy vấn cơ sở dữ liệu để lấy thông tin từ bảng users, role và gender dựa trên email
  const query = `
    SELECT 
      users.*, 
      role.role_name AS role, 
      gender.gender_name AS gender
    FROM 
      users
    LEFT JOIN 
      role ON users.role = role.role_id
    LEFT JOIN 
      gender ON users.gender = gender.gender_id
    WHERE 
      email = $1;
  `;
  
  // Thực hiện truy vấn SQL với tham số email
  pool.query(query, [email], (error, result) => {
    if (error) {
      console.error('Error executing query:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json(result.rows);
    }
  });
});

// Route để lấy tất cả user_id và email từ bảng users với điều kiện role = 1
app.get('/api/email', (req, res) => {
  pool.query('SELECT user_id, email FROM users WHERE role = 2', (error, result) => {
      if (error) {
          console.error('Error executing query:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          res.json(result.rows);
      }
  });
});

// API endpoint để cập nhật thông tin của một địa điểm
app.patch('/api/locations/:locationId', (req, res) => {
  const locationId = req.params.locationId;
  const { name, account, cost, status, note } = req.body;

  // Kiểm tra xem tất cả các trường bắt buộc đã được cung cấp chưa
  if (!name && !account && !cost && typeof status !== 'boolean' && !note) {
    return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một trường để cập nhật: name, account, cost, status' });
  }

  // Tạo object chứa các trường cần cập nhật
  const fieldsToUpdate = {};
  if (name) fieldsToUpdate.location_name = name;
  if (account) fieldsToUpdate.user_id = account;
  if (cost) fieldsToUpdate.cost = cost;
  if (typeof status === 'boolean') fieldsToUpdate.status = status;
  if (note) fieldsToUpdate.note = note;

  // Tiến hành cập nhật thông tin của địa điểm trong cơ sở dữ liệu
  pool.query(
    `UPDATE location SET ${Object.keys(fieldsToUpdate).map((key, index) => `${key} = $${index + 1}`).join(', ')} WHERE location_id = $${Object.keys(fieldsToUpdate).length + 1} RETURNING *`,
    [...Object.values(fieldsToUpdate), locationId],
    (error, result) => {
      if (error) {
        console.error('Lỗi thực thi truy vấn:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
      } else {
        if (result.rows.length > 0) {
          res.json(result.rows[0]); // Trả về thông tin của địa điểm sau khi cập nhật thành công
        } else {
          res.status(404).json({ message: 'Không tìm thấy địa điểm với location_id đã cho' });
        }
      }
    }
  );
});

app.get('/api/emaillocation', (req, res) => {
  // Truy vấn SQL để lấy email, location_id và location_name từ các bảng users và location
  const query = `
      SELECT u.email, l.location_id, l.location_name
      FROM users u
      INNER JOIN location l ON u.user_id = l.user_id;
  `;

  pool.query(query, (error, result) => {
      if (error) {
          console.error('Error executing query:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          res.json(result.rows);
      }
  });
});

app.get('/api/users/token/:user_id', (req, res) => {
  const { user_id } = req.params;

  // Truy vấn SQL để lấy token từ bảng users dựa trên user_id
  const query = `
    SELECT token
    FROM users
    WHERE user_id = $1;
  `;
  
  pool.query(query, [user_id], (error, result) => {
      if (error) {
          console.error('Error executing query:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      } else {
          if (result.rows.length === 0) {
              res.status(404).json({ error: 'User not found' });
          } else {
              const token = result.rows[0].token;
              res.json({ token });
          }
      }
  });
});

// API endpoint để cập nhật thông tin của một người dùng
app.patch('/api/users/:userId', (req, res) => {
  const userId = req.params.userId;
  const { full_name, email, date_of_birth, user_code, phone_number, gender, address, role } = req.body;

  // Kiểm tra xem tất cả các trường bắt buộc đã được cung cấp chưa
  if (!full_name && !email && !date_of_birth && !user_code && !phone_number && !gender && !address && !role) {
    return res.status(400).json({ error: 'Vui lòng cung cấp ít nhất một trường để cập nhật' });
  }

  // Tạo object chứa các trường cần cập nhật
  const fieldsToUpdate = {};
  if (full_name) fieldsToUpdate.full_name = full_name;
  if (email) fieldsToUpdate.email = email;
  if (date_of_birth) fieldsToUpdate.date_of_birth = date_of_birth;
  if (user_code) fieldsToUpdate.user_code = user_code;
  if (phone_number) fieldsToUpdate.phone_number = phone_number;
  if (gender) fieldsToUpdate.gender = gender;
  if (address) fieldsToUpdate.address = address;
  if (role) fieldsToUpdate.role = role;

  // Tiến hành cập nhật thông tin của người dùng trong cơ sở dữ liệu
  pool.query(
    `UPDATE users SET ${Object.keys(fieldsToUpdate).map((key, index) => `${key} = $${index + 1}`).join(', ')} WHERE user_id = $${Object.keys(fieldsToUpdate).length + 1} RETURNING *`,
    [...Object.values(fieldsToUpdate), userId],
    (error, result) => {
      if (error) {
        console.error('Lỗi thực thi truy vấn:', error);
        return res.status(500).json({ error: 'Lỗi máy chủ nội bộ' });
      } else {
        if (result.rows.length > 0) {
          res.json(result.rows[0]); // Trả về thông tin của người dùng sau khi cập nhật thành công
        } else {
          res.status(404).json({ message: 'Không tìm thấy người dùng với user_id đã cho' });
        }
      }
    }
  );
});



app.post('/api/checkin', (req, res) => {
  const { licensePlate, user_id } = req.body;

  // Kiểm tra xem licensePlate và user_id có tồn tại không
  if (!licensePlate || !user_id) {
    return res.status(400).json({message: 'Vui lòng cung cấp licensePlate và user_id' });
  }

  // Lấy thời gian hiện tại ở Việt Nam
  const checkinTime = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');
  
  // Đặt giá trị mặc định cho status
  const status = false;

  // Truy vấn SQL để kiểm tra sự tồn tại của biển số xe với trạng thái false
  const checkQuery = `
    SELECT * FROM checkincheckout WHERE license_plate = $1 AND status = $2
  `;

  // Thực hiện truy vấn kiểm tra
  pool.query(checkQuery, [licensePlate, status], (checkError, checkResult) => {
    if (checkError) {
      console.error('Error executing check query:', checkError);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    if (checkResult.rows.length > 0) {
      // Đã tồn tại một bản ghi với license_plate và status false
      return res.status(409).json({ message: 'Biển số này đã được check-in với trạng thái chưa hoàn thành' });
    }

    // Truy vấn SQL để thêm sự kiện checkin vào bảng checkincheckout
    const insertQuery = `
      INSERT INTO checkincheckout (license_plate, user_id, checkin_time, status)
      VALUES ($1, $2, $3, $4)
    `;

    // Thực hiện truy vấn SQL với licensePlate, user_id, checkinTime và status
    pool.query(insertQuery, [licensePlate, user_id, checkinTime, status], (insertError, insertResult) => {
      if (insertError) {
        console.error('Error executing insert query:', insertError);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      res.status(201).json({  'Checkin thành công' });
    });
  });
});



app.post('/api/checkout', (req, res) => {
  const { licensePlate, userId, locationId } = req.body;
  const currentTime = moment.tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss');

  const checkQuery = `
    SELECT * FROM checkincheckout
    WHERE license_plate = $1 AND status = false
  `;

  pool.query(checkQuery, [licensePlate], (checkError, checkResult) => {
    if (checkError) {
      console.error('Error executing check query:', checkError);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    if (checkResult.rows.length > 0) {
      const costQuery = `
        SELECT cost FROM location WHERE location_id = $1
      `;

      pool.query(costQuery, [locationId], (costError, costResult) => {
        if (costError) {
          console.error('Error executing cost query:', costError);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        const cost = parseFloat(costResult.rows[0].cost);
        console.log('Cost:', cost); // Debugging log

        const walletQuery = `
          SELECT wallet FROM users WHERE user_id = $1
        `;

        pool.query(walletQuery, [userId], (walletError, walletResult) => {
          if (walletError) {
            console.error('Error executing wallet query:', walletError);
            return res.status(500).json({ error: 'Internal Server Error' });
          }

          const wallet = parseFloat(walletResult.rows[0].wallet);
          console.log('Wallet:', wallet); // Debugging log

          if (wallet < cost) {
            console.log('Insufficient funds:', wallet, cost); // Debugging log
            return res.status(400).json({ error: 'Vui lòng nạp thêm tiền để hoàn thành giao dịch' });
          }

          const updateQuery = `
            UPDATE checkincheckout
            SET checkout_time = $1, status = true
            WHERE license_plate = $2 AND status = false
          `;

          pool.query(updateQuery, [currentTime, licensePlate], (updateError, updateResult) => {
            if (updateError) {
              console.error('Error executing update query:', updateError);
              return res.status(500).json({ error: 'Internal Server Error' });
            }

            const updateWalletQuery = `
              UPDATE users
              SET wallet = wallet - $1
              WHERE user_id = $2
            `;

            pool.query(updateWalletQuery, [cost, userId], (walletUpdateError, walletUpdateResult) => {
              if (walletUpdateError) {
                console.error('Error updating wallet:', walletUpdateError);
                return res.status(500).json({ error: 'Internal Server Error' });
              }

              const insertQuery = `
                INSERT INTO transactionhistory (user_id, transaction_type, check_time, amount, tran_time, location)
                VALUES ($1, 2, $2, $3, $4, $5)
              `;

              pool.query(insertQuery, [userId, checkResult.rows[0].check_id, cost, currentTime, locationId], (insertError, insertResult) => {
                if (insertError) {
                  console.error('Error executing insert query:', insertError);
                  return res.status(500).json({ error: 'Internal Server Error' });
                }

                res.status(200).json({ message: 'Checkout thành công' });
              });
            });
          });
        });
      });
    } else {
      res.status(404).json({ message: 'Không tìm thấy dữ liệu phù hợp để thực hiện checkout.' });
    }
  });
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;

    // Truy vấn SQL để lấy danh sách các email từ bảng users với role = 1
    const queryResult = await pool.query('SELECT email FROM users WHERE role = 1');

    // Lấy danh sách email từ kết quả truy vấn
    const adminEmails = queryResult.rows.map(row => row.email);

    // Kiểm tra xem email đã đăng nhập có trong danh sách email của admin không
    if (adminEmails.includes(email)) {
      // Nếu email đã đăng nhập là email của admin
      res.json({ success: true, message: 'Đăng nhập thành công', isAdmin: true });
    } else {
      // Nếu email đã đăng nhập không phải là email của admin
      res.json({ success: true, message: 'Đăng nhập thành công', isAdmin: false });
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(3000);
console.log('Server on port', 3000);