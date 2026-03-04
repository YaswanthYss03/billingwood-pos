const axios = require('axios');

async function test() {
  try {
    const response = await axios.get('http://localhost:4000/api/v1/invoices/bank-accounts', {
      params: { locationId: 'fe7a8809-db2d-42b6-86d0-583114ecedf4' }
    });
    console.log('Success:', response.status, response.data);
  } catch (error) {
    console.log('Error:', error.response?.status, error.response?.data);
    console.log('URL:', error.config?.url);
  }
}

test();
