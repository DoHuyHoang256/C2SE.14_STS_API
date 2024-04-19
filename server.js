const express = require('express');
const { config } = require('dotenv');
const pg = require('pg');
const cors = require('cors');

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
  
    const { full_name, user_code, date_of_birth, phone_number, address, email, role, gender, wallet } = req.body;
  
    // Check if all required fields are provided
    if (!full_name || !user_code || !date_of_birth || !phone_number || !address || !email || !role || !gender || !wallet) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tất cả các trường bắt buộc: full_name, user_code, date_of_birth, phone_number, address, email, role, gender, wallet' });
    }
  
    // Insert new user into the database without specifying user_id
    pool.query('INSERT INTO users (full_name, user_code, date_of_birth, phone_number, address, email, role, gender, wallet) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *', 
      [full_name, user_code, date_of_birth, phone_number, address, email, role, gender, wallet], 
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
  
  // API endpoint để lấy lịch sử giao dịch của một người dùng dựa trên userId
  app.get('/api/transaction-history/:userId', (req, res) => {
    const userId = req.params.userId;
  
    // Truy vấn cơ sở dữ liệu để lấy thông tin lịch sử giao dịch của người dùng từ userId
    pool.query(`
      SELECT 
        users.full_name,
        users.wallet,
        transactionhistory.*
      FROM 
        users
      INNER JOIN 
        transactionhistory ON users.user_id = transactionhistory.user_id
      WHERE 
        users.user_id = $1
    `, [userId], (error, result) => {
      if (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      } else {
        res.json(result.rows);
      }
    });
  });
  
  // API endpoint để thêm một transaction mới
app.post('/api/transactions', (req, res) => {
  // Check if req.body exists
  if (!req.body) {
      return res.status(400).json({ error: 'Yêu cầu không có dữ liệu' });
  }

  const { user_id, transaction_type, amount, tran_time } = req.body;

  // Check if all required fields are provided
  if (!user_id || !transaction_type || !amount || !tran_time) {
      return res.status(400).json({ error: 'Vui lòng cung cấp tất cả các trường bắt buộc: user_id, transaction_type, amount, tran_time' });
  }

  // Insert new transaction into the database without specifying transaction_id
  pool.query('INSERT INTO transactionhistory (user_id, transaction_type, amount, tran_time) VALUES ($1, $2, $3, $4) RETURNING *', 
  [user_id, transaction_type, amount, tran_time], 
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

// API endpoint để lấy tất cả dữ liệu từ bảng "location"
app.get('/api/locations', (req, res) => {
  pool.query('SELECT * FROM location', (error, result) => {
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

  const { location_name } = req.body;

  // Check if all required fields are provided
  if (!location_name) {
    return res.status(400).json({ error: 'Vui lòng cung cấp tên địa điểm' });
  }

  // Insert new location into the database without specifying location_id
  pool.query('INSERT INTO location (location_name) VALUES ($1) RETURNING *', 
    [location_name], 
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
  const { startDate, endDate, location } = req.query;

  // Khai báo mảng params
  let params = [];

  // Xây dựng câu truy vấn SQL dựa trên các tham số được cung cấp
  let query = `
    SELECT 
      l.location_name, -- Thay location bằng location_name
      DATE(th.tran_time) AS transaction_date, 
      COUNT(*) AS total_transactions 
    FROM 
      transactionhistory th
    INNER JOIN
      location l ON th.location = l.location_id -- Join bảng location để lấy location_name
    WHERE 
      th.transaction_type = 2
  `;

  // Thêm điều kiện lọc theo khoảng thời gian nếu startDate và endDate được cung cấp
  if (startDate && endDate) {
    query += ` AND DATE(th.tran_time) BETWEEN $1 AND $2`;
    params.push(startDate);
    params.push(endDate);
  }

  // Thêm điều kiện lọc theo location nếu location được cung cấp
  if (location) {
    // Chuyển location từ string thành một mảng các giá trị
    const locationIds = location.split(',');
    // Tạo các placeholder cho location
    const locationPlaceholders = locationIds.map((_, index) => `$${params.length + index + 1}`).join(',');
    query += ` AND th.location IN (${locationPlaceholders})`;
    // Thêm các giá trị location vào mảng params
    locationIds.forEach(locationId => params.push(parseInt(locationId)));
  }

  // Nhóm kết quả theo ngày và location_name
  query += ` GROUP BY l.location_name, DATE(th.tran_time)`; // Nhóm kết quả theo location_name thay vì location_id

  // Thực thi truy vấn
  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error executing query:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



app.listen(3000);
console.log('Server on port', 3000);