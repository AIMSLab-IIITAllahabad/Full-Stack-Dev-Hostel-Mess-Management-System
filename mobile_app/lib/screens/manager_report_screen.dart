import 'package:flutter/material.dart';

import '../services/api_client.dart';

class ManagerReportScreen extends StatefulWidget {
  const ManagerReportScreen({super.key});

  @override
  State<ManagerReportScreen> createState() => _ManagerReportScreenState();
}

class _ManagerReportScreenState extends State<ManagerReportScreen> {
  Map<String, dynamic>? _report;
  List<Map<String, dynamic>> _attendance = [];
  List<String> _hostels = [];
  String? _selectedHostel; // null = all hostels
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHostels();
    _load();
  }

  Future<void> _loadHostels() async {
    try {
      final result = await ApiClient.get("/api/hostels");
      setState(() {
        _hostels = (result["hostels"] as List)
            .map((h) => h["name"].toString())
            .toList();
      });
    } catch (_) {}
  }

  Future<void> _load() async {
    try {
      final query = _selectedHostel == null
          ? ""
          : "?hostel=${Uri.encodeComponent(_selectedHostel!)}";

      final reportResult =
          await ApiClient.get("/api/manager/report$query");
      final attendanceResult =
          await ApiClient.get("/api/attendance/today$query");

      setState(() {
        _report = (reportResult["report"] as Map).cast<String, dynamic>();
        _attendance = (attendanceResult["records"] as List)
            .map((r) => (r as Map).cast<String, dynamic>())
            .toList();
        _error = null;
      });
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = "Cannot reach server");
    }
  }

  Widget _statCard(String label, dynamic value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 6),
            Text(
              "$value",
              style:
                  const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
            ),
            Text(label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }

  List<Widget> _overallCards() {
    return [
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.5,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        children: [
          _statCard("Total Students", _report!["totalStudents"],
              Icons.people, Colors.blue),
          _statCard("Eating Today", _report!["activeSubscriptions"],
              Icons.card_membership, Colors.teal),
          _statCard("Absentees Today", _report!["absentees"],
              Icons.event_busy, Colors.orange),
          _statCard("Meals To Prepare", _report!["mealsToPrepare"],
              Icons.restaurant, Colors.green),
        ],
      ),
    ];
  }

  List<Widget> _hostelCards() {
    return [
      Card(
        child: ListTile(
          leading: const Icon(Icons.apartment, color: Colors.blue),
          title: Text("${_report!["hostel"]} — total strength"),
          subtitle: Text("Capacity: ${_report!["capacity"]}"),
          trailing: Text(
            "${_report!["residents"]}",
            style:
                const TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
        ),
      ),
      const SizedBox(height: 8),
      GridView.count(
        crossAxisCount: 2,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        childAspectRatio: 1.5,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        children: [
          _statCard("Absent Today", _report!["absenteesToday"],
              Icons.event_busy, Colors.orange),
          _statCard("Meals To Prepare", _report!["mealsToPrepare"],
              Icons.restaurant, Colors.green),
          _statCard("Home Students Present", _report!["homePresent"],
              Icons.home, Colors.teal),
          _statCard("Guest Students Present", _report!["guestPresent"],
              Icons.group_add, Colors.purple),
        ],
      ),
      const SizedBox(height: 8),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Guest seats",
                  style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: (_report!["guestSeatsTotal"] ?? 0) == 0
                    ? 0
                    : ((_report!["guestSeatsTotal"] -
                                _report!["guestSeatsAvailable"]) /
                            _report!["guestSeatsTotal"])
                        .toDouble(),
                minHeight: 10,
                borderRadius: BorderRadius.circular(6),
              ),
              const SizedBox(height: 6),
              Text(
                  "${_report!["guestSeatsTotal"] - _report!["guestSeatsAvailable"]} filled • ${_report!["guestSeatsAvailable"]} vacant • ${_report!["guestSeatsTotal"]} total"),
            ],
          ),
        ),
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Mess Report — Today")),
      body: _error != null
          ? Center(child: Text(_error!))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  DropdownButtonFormField<String?>(
                    initialValue: _selectedHostel,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: "Hostel",
                      border: OutlineInputBorder(),
                    ),
                    items: [
                      const DropdownMenuItem<String?>(
                        value: null,
                        child: Text("All hostels (overall)"),
                      ),
                      ..._hostels.map((h) =>
                          DropdownMenuItem<String?>(value: h, child: Text(h))),
                    ],
                    onChanged: (v) {
                      setState(() {
                        _selectedHostel = v;
                        _report = null;
                      });
                      _load();
                    },
                  ),
                  const SizedBox(height: 12),
                  if (_report == null)
                    const Padding(
                      padding: EdgeInsets.all(40),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else ...[
                    if (_selectedHostel == null)
                      ..._overallCards()
                    else
                      ..._hostelCards(),
                    const SizedBox(height: 8),
                    Card(
                      child: ListTile(
                        leading:
                            const Icon(Icons.fact_check, color: Colors.purple),
                        title: const Text("Meals served today"),
                        trailing: Text(
                          "${_report!["mealsServedToday"] ?? 0}",
                          style: const TextStyle(
                              fontSize: 20, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text("Today's Attendance",
                        style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 8),
                    if (_attendance.isEmpty)
                      const Card(
                        child: ListTile(title: Text("No scans yet today")),
                      )
                    else
                      ..._attendance.map((record) {
                        final student =
                            record["studentId"] as Map<String, dynamic>?;
                        return Card(
                          child: ListTile(
                            leading: const Icon(Icons.face),
                            title: Text(student?["name"] ?? "Unknown"),
                            subtitle: Text(
                                "${student?["rollNumber"] ?? ""} • ${record["mealType"]} • ${record["hostel"]}"),
                            trailing: Text(
                                ((record["matchConfidence"] ?? 0) as num).toStringAsFixed(2)),
                          ),
                        );
                      }),
                  ],
                ],
              ),
            ),
    );
  }
}