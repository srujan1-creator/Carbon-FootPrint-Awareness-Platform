import os
import json
import sqlite3
import unittest
import server

class ServerTestCase(unittest.TestCase):
    def setUp(self):
        # Override the database with a test-specific file
        self.db_path = 'test_data.db'
        server.DATABASE = self.db_path
        
        # Initialize the database
        server.init_db()
        
        # Configure app for testing
        server.app.config['TESTING'] = True
        self.app = server.app.test_client()

    def tearDown(self):
        # Clean up the test database file
        if os.path.exists(self.db_path):
            try:
                os.remove(self.db_path)
            except OSError:
                pass

    def test_get_profile_default(self):
        response = self.app.get('/api/profile')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data, {})

    def test_save_and_get_profile(self):
        test_profile = {
            "calculatorInputs": {
                "energy": {"electricityKwh": 500}
            },
            "unlockedBadges": {}
        }
        
        # Save profile
        response = self.app.post(
            '/api/profile',
            data=json.dumps(test_profile),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        res_data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(res_data.get("success"))
        
        # Retrieve profile
        response = self.app.get('/api/profile')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data["calculatorInputs"]["energy"]["electricityKwh"], 500)

    def test_save_chat_message(self):
        msg_payload = {
            "sender": "user",
            "text": "Hello Advisor!"
        }
        
        response = self.app.post(
            '/api/chat',
            data=json.dumps(msg_payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        res_data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(res_data.get("success"))
        
        # Verify in history
        response = self.app.get('/api/chat')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["sender"], "user")
        self.assertEqual(data[0]["text"], "Hello Advisor!")

    def test_clear_chat(self):
        # Insert a message first
        msg_payload = {"sender": "ai", "text": "Greeting"}
        self.app.post(
            '/api/chat',
            data=json.dumps(msg_payload),
            content_type='application/json'
        )
        
        # Clear chat
        response = self.app.post('/api/chat/clear')
        self.assertEqual(response.status_code, 200)
        res_data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(res_data.get("success"))
        
        # Check chat is empty
        response = self.app.get('/api/chat')
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(len(data), 0)

    def test_security_headers(self):
        response = self.app.get('/')
        self.assertEqual(response.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')
        self.assertEqual(response.headers.get('X-XSS-Protection'), '1; mode=block')
        self.assertTrue('Content-Security-Policy' in response.headers)

if __name__ == '__main__':
    unittest.main()
