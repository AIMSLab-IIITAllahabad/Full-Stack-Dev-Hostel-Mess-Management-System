import 'package:flutter/material.dart';

import '../services/api_client.dart';
import 'login_screen.dart';
import 'manager_report_screen.dart';
import 'profile_screen.dart';
import 'rebate_screen.dart';
import 'subscription_screen.dart';
import 'wallet_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _data;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final result = await ApiClient.get("/api/dashboard");
      setState(() => _data = result);
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = "Cannot reach server");
    }
  }

  Future<void> _logout() async {
    await ApiClient.clearSession();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  void _openSubscription() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const SubscriptionScreen()))
        .then((_) => _load());
  }

  void _openRebates() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const RebateScreen()))
        .then((_) => _load());
  }

  void _openProfile() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const ProfileScreen()))
        .then((_) => _load());
  }

  void _openWallet() {
    Navigator.of(context)
        .push(MaterialPageRoute(builder: (_) => const WalletScreen()))
        .then((_) => _load());
  }

  void _openManagerReport() {
    Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ManagerReportScreen()));
  }

  @override
  Widget build(BuildContext context) {
    final user = _data?["user"] as Map<String, dynamic>?;
    final subscription = _data?["subscription"] as Map<String, dynamic>?;

    return Scaffold(
      appBar: AppBar(
        title: const Text("OmniMess"),
        actions: [
          IconButton(onPressed: _logout, icon: const Icon(Icons.logout)),
        ],
      ),
      body: _error != null
          ? Center(child: Text(_error!))
          : _data == null
              ? const Center(child: CircularProgressIndicator())
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                              child: Icon(Icons.person)),
                          title: Text(user?["name"] ?? ""),
                          subtitle: Text(
                              "${user?["rollNumber"] ?? ""} • Room ${user?["roomNumber"] ?? ""}"),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: _openProfile,
                        ),
                      ),
                      if (user?["role"] == "STUDENT") ...[
                        const SizedBox(height: 8),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.account_balance_wallet,
                                color: Colors.teal),
                            title: const Text("Wallet"),
                            trailing: Text(
                              "₹${user?["walletBalance"] ?? 0}",
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            onTap: _openWallet,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Card(
                          child: ListTile(
                            leading: Icon(
                              subscription != null
                                  ? Icons.check_circle
                                  : Icons.cancel,
                              color: subscription != null
                                  ? Colors.green
                                  : Colors.red,
                            ),
                            title: Text(subscription != null
                                ? "Active subscription"
                                : "No active subscription"),
                            subtitle: Text(subscription != null
                                ? "Mess: ${subscription["selectedHostel"]}"
                                : "Subscribe to a mess to get started"),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: _openSubscription,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Card(
                          child: ListTile(
                            leading: const Icon(Icons.receipt_long),
                            title: const Text("Meals & Rebates"),
                            trailing: Text(
                              "${_data?["rebateCount"] ?? 0}",
                              style: const TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            onTap: _openRebates,
                          ),
                        ),
                      ],
                      if (user?["role"] == "MANAGER" ||
                          user?["role"] == "ADMIN") ...[
                        const SizedBox(height: 8),
                        Card(
                          color: Colors.teal.shade50,
                          child: ListTile(
                            leading: const Icon(Icons.analytics,
                                color: Colors.teal),
                            title: const Text("Mess Report"),
                            subtitle: const Text(
                                "Today's meals, absentees & attendance"),
                            trailing: const Icon(Icons.chevron_right),
                            onTap: _openManagerReport,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
    );
  }
}
