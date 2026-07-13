import 'package:flutter/material.dart';

import 'screens/login_screen.dart';

void main() {
  runApp(const OmniMessApp());
}

class OmniMessApp extends StatelessWidget {
  const OmniMessApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OmniMess',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}