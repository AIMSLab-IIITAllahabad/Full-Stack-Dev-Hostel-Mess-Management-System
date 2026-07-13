import 'package:flutter/material.dart';

import '../services/api_client.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  Map<String, dynamic>? _subscription;
  List<Map<String, dynamic>> _hostels = [];
  String? _selectedHostel;
  String? _homeHostel;
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    final user = await ApiClient.getUser();
    _homeHostel = user?["homeHostel"]?.toString();

    try {
      final hostelResult = await ApiClient.get("/api/hostels");
      _hostels = (hostelResult["hostels"] as List)
          .map((h) => (h as Map).cast<String, dynamic>())
          .toList();
    } catch (_) {}

    try {
      final result = await ApiClient.get("/api/subscriptions/current");
      _subscription =
          (result["subscription"] as Map).cast<String, dynamic>();
    } on ApiException {
      _subscription = null; // 404 = no active subscription, that's fine
    } catch (_) {}

    if (mounted) setState(() => _loading = false);
  }

  bool get _endsToday {
    final iso = _subscription?["endDate"]?.toString();
    if (iso == null) return false;
    final end = DateTime.tryParse(iso)?.toUtc();
    if (end == null) return false;
    final now = DateTime.now();
    return end.year == now.year &&
        end.month == now.month &&
        end.day == now.day;
  }

  Future<void> _subscribe() async {
    if (_selectedHostel == null) {
      _showMessage("Choose a mess first");
      return;
    }

    setState(() => _submitting = true);

    try {
      final result = await ApiClient.post(
        "/api/subscriptions",
        {"selectedHostel": _selectedHostel},
      );
      _showMessage(
          result["message"]?.toString() ?? "Subscribed! Starts tomorrow.");
      await _load();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  void _showMessage(String text) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  String _formatDate(String? iso) {
    if (iso == null) return "";
    final d = DateTime.tryParse(iso)?.toUtc();
    if (d == null) return "";
    return "${d.day}/${d.month}/${d.year}";
  }

  String _hostelLabel(Map<String, dynamic> hostel) {
    final name = hostel["name"].toString();
    if (name == _homeHostel) {
      return "$name  (home hostel)";
    }
    final available = hostel["guestSeatsAvailable"] ?? 0;
    final total = hostel["guestSeatsTotal"] ?? 0;
    return "$name  ($available/$total guest seats left)";
  }

  Widget _buildSubscribeForm({required bool isRenewal}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (isRenewal)
          Card(
            color: Colors.orange.shade50,
            child: const ListTile(
              leading: Icon(Icons.schedule, color: Colors.orange),
              title: Text("Your subscription ends today"),
              subtitle: Text(
                  "Choose any mess before 10 PM — otherwise your home hostel will be selected automatically"),
            ),
          )
        else
          const Card(
            child: ListTile(
              leading: Icon(Icons.info_outline),
              title: Text("No active subscription"),
              subtitle: Text(
                  "Choose a mess below — your 15-day plan starts tomorrow"),
            ),
          ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: _selectedHostel,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: "Choose a mess",
            border: OutlineInputBorder(),
          ),
          items: _hostels
              .map((h) => DropdownMenuItem(
                    value: h["name"].toString(),
                    child: Text(
                      _hostelLabel(h),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ))
              .toList(),
          onChanged: (v) => setState(() => _selectedHostel = v),
        ),
        const SizedBox(height: 8),
        const Text(
          "30% of every mess's seats are reserved for guest students. "
          "Choosing a mess other than your home hostel uses one guest seat.",
          style: TextStyle(fontSize: 12, color: Colors.grey),
        ),
        if (_selectedHostel != null) ...[
          const SizedBox(height: 8),
          Text(
            _selectedHostel == _homeHostel
                ? "Charged ₹150/day for 15 days (₹2250 wallet balance required)"
                : "Charged ₹200/day for 15 days (₹3000 wallet balance required)",
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
        ],
        if (_selectedHostel != null && _selectedHostel != _homeHostel) ...[
          const SizedBox(height: 12),
          Builder(builder: (context) {
            final hostel = _hostels.firstWhere(
              (h) => h["name"] == _selectedHostel,
              orElse: () => {},
            );
            final total = (hostel["guestSeatsTotal"] ?? 0) as int;
            final available = (hostel["guestSeatsAvailable"] ?? 0) as int;
            final filled = total - available;

            return Card(
              color: Colors.purple.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Guest seats at $_selectedHostel",
                        style: Theme.of(context).textTheme.titleSmall),
                    const SizedBox(height: 10),
                    LinearProgressIndicator(
                      value: total == 0 ? 0 : filled / total,
                      minHeight: 12,
                      borderRadius: BorderRadius.circular(6),
                      backgroundColor: Colors.purple.shade100,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text("Filled: $filled"),
                        Text("Vacant: $available"),
                        Text("Total: $total"),
                      ],
                    ),
                    if (available == 0)
                      const Padding(
                        padding: EdgeInsets.only(top: 8),
                        child: Text("⚠ No guest seats left",
                            style: TextStyle(color: Colors.red)),
                      ),
                  ],
                ),
              ),
            );
          }),
        ],
        const SizedBox(height: 16),
        SizedBox(
          height: 50,
          child: FilledButton(
            onPressed: _submitting ? null : _subscribe,
            child: _submitting
                ? const CircularProgressIndicator(strokeWidth: 2)
                : Text(isRenewal ? "Renew (15 days)" : "Subscribe (15 days)"),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mess Subscription")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_subscription != null) ...[
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.check_circle,
                                    color: Colors.green),
                                const SizedBox(width: 8),
                                Text(
                                  "Active Subscription",
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleMedium,
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text("Mess: ${_subscription!["selectedHostel"]}"),
                            Text(
                                "From: ${_formatDate(_subscription!["startDate"])}"),
                            Text(
                                "Until: ${_formatDate(_subscription!["endDate"])}"),
                            if (_subscription!["autoRenewed"] == true)
                              const Padding(
                                padding: EdgeInsets.only(top: 8),
                                child: Text(
                                  "Auto-renewed to your home hostel",
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.orange),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                    if (_endsToday) ...[
                      const SizedBox(height: 16),
                      _buildSubscribeForm(isRenewal: true),
                    ],
                  ] else
                    _buildSubscribeForm(isRenewal: false),
                ],
              ),
            ),
    );
  }
}