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
        response.close()

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
        response.close()
        
        # Retrieve profile
        response = self.app.get('/api/profile')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(data["calculatorInputs"]["energy"]["electricityKwh"], 500)
        response.close()

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
        response.close()
        
        # Verify in history
        response = self.app.get('/api/chat')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["sender"], "user")
        self.assertEqual(data[0]["text"], "Hello Advisor!")
        response.close()

    def test_clear_chat(self):
        # Insert a message first
        msg_payload = {"sender": "ai", "text": "Greeting"}
        response1 = self.app.post(
            '/api/chat',
            data=json.dumps(msg_payload),
            content_type='application/json'
        )
        response1.close()
        
        # Clear chat
        response = self.app.post('/api/chat/clear')
        self.assertEqual(response.status_code, 200)
        res_data = json.loads(response.data.decode('utf-8'))
        self.assertTrue(res_data.get("success"))
        response.close()
        
        # Check chat is empty
        response = self.app.get('/api/chat')
        data = json.loads(response.data.decode('utf-8'))
        self.assertEqual(len(data), 0)
        response.close()

    def test_security_headers(self):
        response = self.app.get('/')
        self.assertEqual(response.headers.get('X-Content-Type-Options'), 'nosniff')
        self.assertEqual(response.headers.get('X-Frame-Options'), 'DENY')
        self.assertEqual(response.headers.get('X-XSS-Protection'), '1; mode=block')
        self.assertTrue('Content-Security-Policy' in response.headers)
        response.close()

    def test_restrict_sensitive_files(self):
        response = self.app.get('/server.py')
        self.assertEqual(response.status_code, 403)
        response.close()

        response = self.app.get('/data.db')
        self.assertEqual(response.status_code, 403)
        response.close()

        response = self.app.get('/.git/config')
        self.assertEqual(response.status_code, 403)
        response.close()

    def test_advisor_missing_message(self):
        response = self.app.post(
            '/api/advisor',
            data=json.dumps({"apiKey": "test_key"}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue("error" in data)
        response.close()

    def test_advisor_missing_key(self):
        response = self.app.post(
            '/api/advisor',
            data=json.dumps({"message": "Hello"}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data.decode('utf-8'))
        self.assertTrue("error" in data)
        response.close()

if __name__ == '__main__':
    unittest.main()
