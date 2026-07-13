import 'package:flutter/material.dart';

import '../services/api_client.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _user;
  final _phone = TextEditingController();
  final _room = TextEditingController();
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ApiClient.get("/api/profile");
      final user = (result["user"] as Map).cast<String, dynamic>();
      setState(() {
        _user = user;
        _phone.text = user["phoneNumber"]?.toString() ?? "";
        _room.text = user["roomNumber"]?.toString() ?? "";
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
      _showMessage("Could not load profile");
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);

    try {
      await ApiClient.put("/api/profile", {
        "phoneNumber": _phone.text.trim(),
        "roomNumber": _room.text.trim(),
      });
      _showMessage("Profile updated");
      await _load();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("My Profile")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text("Name: ${_user?["name"] ?? ""}"),
                        Text("Roll No: ${_user?["rollNumber"] ?? ""}"),
                        Text("Email: ${_user?["email"] ?? ""}"),
                        Text("Hostel: ${_user?["homeHostel"] ?? ""}"),
                        Text("Role: ${_user?["role"] ?? ""}"),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: "Phone Number",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: _room,
                  decoration: const InputDecoration(
                    labelText: "Room Number",
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  height: 50,
                  child: FilledButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const CircularProgressIndicator(strokeWidth: 2)
                        : const Text("Save Changes"),
                  ),
                ),
              ],
            ),
    );
  }
}