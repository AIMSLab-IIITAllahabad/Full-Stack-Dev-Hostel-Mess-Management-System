import 'package:flutter/material.dart';

import '../services/api_client.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  num _balance = 0;
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final result = await ApiClient.get("/api/wallet");
      _balance = (result["balance"] ?? 0) as num;
      _transactions = (result["transactions"] as List)
          .map((t) => (t as Map).cast<String, dynamic>())
          .toList();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _topUp() async {
    final controller = TextEditingController();

    final amount = await showDialog<num>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Add money"),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: "Amount (₹)",
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text("Cancel"),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.pop(context, num.tryParse(controller.text.trim())),
            child: const Text("Add"),
          ),
        ],
      ),
    );

    if (amount == null || amount <= 0) return;

    try {
      final result =
          await ApiClient.post("/api/wallet/topup", {"amount": amount});
      _showMessage(result["message"]?.toString() ?? "Added");
      await _load();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  IconData _txnIcon(String type) {
    switch (type) {
      case "TOPUP":
        return Icons.add_circle;
      case "REBATE_DAY":
        return Icons.savings;
      case "REBATE_REFUND":
        return Icons.undo;
      default:
        return Icons.restaurant; // MEAL_CHARGE
    }
  }

  String _formatWhen(String? iso) {
    final d = DateTime.tryParse(iso ?? "")?.toLocal();
    if (d == null) return "";
    return "${d.day}/${d.month}/${d.year}";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("My Wallet")),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _topUp,
        icon: const Icon(Icons.add),
        label: const Text("Add Money"),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    color: Colors.teal,
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          const Text("Balance",
                              style: TextStyle(color: Colors.white70)),
                          const SizedBox(height: 4),
                          Text(
                            "₹$_balance",
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 36,
                                fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Card(
                    child: Padding(
                      padding: EdgeInsets.all(12),
                      child: Text(
                        "Charged daily: home hostel ₹150/day, guest hostel ₹200/day. "
                        "Rebate days cost a flat ₹54, refunded in full if cancelled.",
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text("Transactions",
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  if (_transactions.isEmpty)
                    const Card(
                        child: ListTile(title: Text("No transactions yet")))
                  else
                    ..._transactions.map((txn) {
                      final amount = (txn["amount"] ?? 0) as num;
                      final positive = amount >= 0;
                      return Card(
                        child: ListTile(
                          leading: Icon(
                            _txnIcon(txn["type"]?.toString() ?? ""),
                            color: positive ? Colors.green : Colors.red,
                          ),
                          title: Text(txn["description"]?.toString() ?? ""),
                          subtitle:
                              Text(_formatWhen(txn["createdAt"]?.toString())),
                          trailing: Text(
                            "${positive ? "+" : ""}₹$amount",
                            style: TextStyle(
                                color: positive ? Colors.green : Colors.red,
                                fontWeight: FontWeight.bold),
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}