import 'package:flutter/material.dart';

import '../services/api_client.dart';
import 'dashboard_screen.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _name = TextEditingController();
  final _roll = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _room = TextEditingController();
  final _phone = TextEditingController();

  List<String> _hostels = [];
  String? _selectedHostel;
  bool _loading = false;
  bool _loadingHostels = true;

  @override
  void initState() {
    super.initState();
    _fetchHostels();
  }

  Future<void> _fetchHostels() async {
    try {
      final result = await ApiClient.get("/api/hostels");
      final list = (result["hostels"] as List)
          .map((h) => h["name"].toString())
          .toList();
      setState(() {
        _hostels = list;
        _loadingHostels = false;
      });
    } catch (_) {
      setState(() => _loadingHostels = false);
      _showMessage("Could not load hostels — is the server running?");
    }
  }

  Future<void> _register() async {
    if (_name.text.trim().isEmpty ||
        _roll.text.trim().isEmpty ||
        _email.text.trim().isEmpty ||
        _password.text.isEmpty ||
        _room.text.trim().isEmpty ||
        _selectedHostel == null) {
      _showMessage("Please fill all required fields");
      return;
    }

    setState(() => _loading = true);

    try {
      final result = await ApiClient.post(
        "/api/auth/register",
        {
          "name": _name.text.trim(),
          "rollNumber": _roll.text.trim(),
          "email": _email.text.trim(),
          "password": _password.text,
          "hostel": _selectedHostel,
          "homeHostel": _selectedHostel,
          "roomNumber": _room.text.trim(),
          "phoneNumber": _phone.text.trim(),
        },
        auth: false,
      );

      await ApiClient.saveSession(
        result["token"] as String,
        (result["user"] as Map).cast<String, dynamic>(),
      );

      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const DashboardScreen()),
        (route) => false,
      );
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
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
      appBar: AppBar(title: const Text("Create Account")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              TextField(
                controller: _name,
                decoration: const InputDecoration(
                  labelText: "Full Name *",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _roll,
                decoration: const InputDecoration(
                  labelText: "Roll Number *",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  labelText: "Email *",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: "Password (min 6 chars) *",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              _loadingHostels
                  ? const Padding(
                      padding: EdgeInsets.all(8),
                      child: CircularProgressIndicator(),
                    )
                  : DropdownButtonFormField<String>(
                      initialValue: _selectedHostel,
                      decoration: const InputDecoration(
                        labelText: "Your Hostel *",
                        border: OutlineInputBorder(),
                      ),
                      items: _hostels
                          .map((h) =>
                              DropdownMenuItem(value: h, child: Text(h)))
                          .toList(),
                      onChanged: (v) => setState(() => _selectedHostel = v),
                    ),
              const SizedBox(height: 14),
              TextField(
                controller: _room,
                decoration: const InputDecoration(
                  labelText: "Room Number *",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: "Phone Number",
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: FilledButton(
                  onPressed: _loading ? null : _register,
                  child: _loading
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text("Register", style: TextStyle(fontSize: 16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}