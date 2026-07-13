import 'package:flutter/material.dart';

import '../services/api_client.dart';
import 'dashboard_screen.dart';
import 'register_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _rollController = TextEditingController();
  final _passwordController = TextEditingController();
  String _loginAs = "STUDENT"; // or "ADMIN"
  bool _loading = false;

  Future<void> _login() async {
    final roll = _rollController.text.trim();
    final password = _passwordController.text;

    if (roll.isEmpty || password.isEmpty) {
      _showMessage("Enter roll number and password");
      return;
    }

    setState(() => _loading = true);

    try {
      final result = await ApiClient.post(
        "/api/auth/login",
        {"rollNumber": roll, "password": password},
        auth: false,
      );

      final user = (result["user"] as Map).cast<String, dynamic>();
      final role = user["role"]?.toString() ?? "STUDENT";

      // The selected portal must match the account's role
      if (_loginAs == "ADMIN" && role == "STUDENT") {
        _showMessage("This account is not an admin/manager account");
        return;
      }
      if (_loginAs == "STUDENT" && role != "STUDENT") {
        _showMessage("Admins must use the Admin option to login");
        return;
      }

      await ApiClient.saveSession(result["token"] as String, user);

      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
        (route) => false,
      );
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server — check baseUrl in config.dart");
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.restaurant, size: 72, color: Colors.teal),
                const SizedBox(height: 8),
                const Text(
                  "OmniMess",
                  style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
                ),
                const Text("Smart Hostel Network"),
                const SizedBox(height: 32),
                Row(
                  children: [
                    Expanded(
                      child: RadioListTile<String>(
                        title: const Text("Student"),
                        value: "STUDENT",
                        groupValue: _loginAs,
                        contentPadding: EdgeInsets.zero,
                        onChanged: (v) => setState(() => _loginAs = v!),
                      ),
                    ),
                    Expanded(
                      child: RadioListTile<String>(
                        title: const Text("Admin"),
                        value: "ADMIN",
                        groupValue: _loginAs,
                        contentPadding: EdgeInsets.zero,
                        onChanged: (v) => setState(() => _loginAs = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _rollController,
                  decoration: const InputDecoration(
                    labelText: "Roll Number",
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.badge),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  decoration: const InputDecoration(
                    labelText: "Password",
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.lock),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: FilledButton(
                    onPressed: _loading ? null : _login,
                    child: _loading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(
                            "Login as ${_loginAs == "ADMIN" ? "Admin" : "Student"}",
                            style: const TextStyle(fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const RegisterScreen()),
                  ),
                  child: const Text("New student? Create account"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}