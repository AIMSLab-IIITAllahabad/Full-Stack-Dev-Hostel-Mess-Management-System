import 'package:flutter/material.dart';

import '../services/api_client.dart';

class RebateScreen extends StatefulWidget {
  const RebateScreen({super.key});

  @override
  State<RebateScreen> createState() => _RebateScreenState();
}

class _RebateScreenState extends State<RebateScreen> {
  List<Map<String, dynamic>> _rebates = [];
  Set<String> _eatenDays = {};
  Set<String> _rebatedDays = {};
  DateTime? _subStart;
  DateTime? _subEnd;
  DateTime _month = DateTime(DateTime.now().year, DateTime.now().month, 1);
  bool _loading = true;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _key(DateTime d) => "${d.year}-${d.month}-${d.day}";

  DateTime? _parseUtcDay(String? iso) {
    if (iso == null) return null;
    final d = DateTime.tryParse(iso)?.toUtc();
    if (d == null) return null;
    return DateTime(d.year, d.month, d.day);
  }

  Future<void> _load() async {
    setState(() => _loading = true);

    try {
      final result = await ApiClient.get("/api/subscriptions/current");
      final sub = (result["subscription"] as Map).cast<String, dynamic>();
      _subStart = _parseUtcDay(sub["startDate"]?.toString());
      _subEnd = _parseUtcDay(sub["endDate"]?.toString());
    } catch (_) {
      _subStart = null;
      _subEnd = null;
    }

    try {
      final result = await ApiClient.get("/api/rebates/history");
      _rebates = (result["rebates"] as List)
          .map((r) => (r as Map).cast<String, dynamic>())
          .toList();
      _rebatedDays = _rebates
          .where((r) => r["status"] == "APPROVED")
          .map((r) => _parseUtcDay(r["date"]?.toString()))
          .whereType<DateTime>()
          .map(_key)
          .toSet();
    } catch (_) {}

    try {
      final result = await ApiClient.get("/api/attendance/my");
      _eatenDays = (result["records"] as List)
          .map((r) => _parseUtcDay((r as Map)["date"]?.toString()))
          .whereType<DateTime>()
          .map(_key)
          .toSet();
    } catch (_) {}

    if (mounted) setState(() => _loading = false);
  }

  bool _inSubscription(DateTime day) {
    if (_subStart == null || _subEnd == null) return false;
    return !day.isBefore(_subStart!) && !day.isAfter(_subEnd!);
  }

  Future<void> _requestRebate() async {
    final now = DateTime.now();
    final tomorrow = now.add(const Duration(days: 1));

    final picked = await showDatePicker(
      context: context,
      initialDate: tomorrow,
      firstDate: tomorrow,
      lastDate: now.add(const Duration(days: 30)),
      helpText: "Which day will you be absent?",
    );

    if (picked == null) return;

    setState(() => _submitting = true);

    final dateString =
        "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";

    try {
      final result =
          await ApiClient.post("/api/rebates", {"date": dateString});
      _showMessage(result["message"]?.toString() ?? "Rebate created");
      await _load();
    } on ApiException catch (e) {
      _showMessage(e.message);
    } catch (_) {
      _showMessage("Cannot reach server");
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _cancelRebate(String id) async {
    try {
      final result = await ApiClient.put("/api/rebates/$id/cancel");
      _showMessage(result["message"]?.toString() ?? "Rebate cancelled");
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

  String _formatDate(String? iso) {
    final d = _parseUtcDay(iso);
    if (d == null) return "";
    return "${d.day}/${d.month}/${d.year}";
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }

  Widget _buildCalendar() {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    final firstDay = _month;
    final daysInMonth = DateTime(_month.year, _month.month + 1, 0).day;
    final leadingBlanks = firstDay.weekday % 7; // Sunday-first grid
    final today = DateTime.now();
    final todayKey = _key(DateTime(today.year, today.month, today.day));

    final cells = <Widget>[];

    for (var i = 0; i < leadingBlanks; i++) {
      cells.add(const SizedBox());
    }

    for (var day = 1; day <= daysInMonth; day++) {
      final date = DateTime(_month.year, _month.month, day);
      final k = _key(date);

      Color? fill;
      Color textColor = Colors.black87;

      if (_eatenDays.contains(k)) {
        fill = Colors.green;
        textColor = Colors.white;
      } else if (_rebatedDays.contains(k)) {
        fill = Colors.red;
        textColor = Colors.white;
      } else if (_inSubscription(date)) {
        fill = Colors.teal.shade50;
      }

      cells.add(
        Container(
          margin: const EdgeInsets.all(2),
          decoration: BoxDecoration(
            color: fill,
            borderRadius: BorderRadius.circular(8),
            border: k == todayKey
                ? Border.all(color: Colors.teal, width: 2)
                : _inSubscription(date) && fill == Colors.teal.shade50
                    ? Border.all(color: Colors.teal.shade200)
                    : null,
          ),
          alignment: Alignment.center,
          child: Text("$day",
              style: TextStyle(
                  color: textColor,
                  fontWeight:
                      k == todayKey ? FontWeight.bold : FontWeight.normal)),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: () => setState(() =>
                      _month = DateTime(_month.year, _month.month - 1, 1)),
                ),
                Text(
                  "${monthNames[_month.month - 1]} ${_month.year}",
                  style: const TextStyle(
                      fontSize: 16, fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: () => setState(() =>
                      _month = DateTime(_month.year, _month.month + 1, 1)),
                ),
              ],
            ),
            GridView.count(
              crossAxisCount: 7,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              children: [
                ...["S", "M", "T", "W", "T", "F", "S"].map((d) => Center(
                    child: Text(d,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.grey)))),
                ...cells,
              ],
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 16,
              runSpacing: 4,
              children: [
                _legendDot(Colors.teal.shade100, "Subscribed"),
                _legendDot(Colors.green, "Ate (verified)"),
                _legendDot(Colors.red, "Rebate day"),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Meals & Rebates")),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _submitting ? null : _requestRebate,
        icon: const Icon(Icons.event_busy),
        label: const Text("Mark Absence"),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(12),
                children: [
                  _buildCalendar(),
                  const SizedBox(height: 12),
                  Text("Rebate History",
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 4),
                  if (_rebates.isEmpty)
                    const Card(
                      child: ListTile(
                        title: Text("No rebates yet"),
                        subtitle: Text(
                            "Tap Mark Absence when you'll skip a day (₹96 back per day)"),
                      ),
                    )
                  else
                    ..._rebates.map((rebate) {
                      final approved = rebate["status"] == "APPROVED";
                      final date = _parseUtcDay(rebate["date"]?.toString());
                      final now = DateTime.now();
                      final tomorrow =
                          DateTime(now.year, now.month, now.day + 1);
                      final cancellable = approved &&
                          date != null &&
                          !date.isBefore(tomorrow);

                      return Card(
                        child: ListTile(
                          leading: Icon(
                            approved
                                ? Icons.event_busy
                                : Icons.event_available,
                            color: approved ? Colors.red : Colors.grey,
                          ),
                          title:
                              Text(_formatDate(rebate["date"]?.toString())),
                          subtitle: Text(
                              "${rebate["status"]} • ₹${rebate["amount"]}"),
                          trailing: cancellable
                              ? TextButton(
                                  onPressed: () => _cancelRebate(
                                      rebate["_id"].toString()),
                                  child: const Text("Cancel"),
                                )
                              : null,
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}