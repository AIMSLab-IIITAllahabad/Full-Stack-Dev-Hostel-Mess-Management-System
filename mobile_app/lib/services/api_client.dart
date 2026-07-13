import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../config.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  @override
  String toString() => message;
}

class ApiClient {
  static const _tokenKey = "omnimess_token";
  static const _userKey = "omnimess_user";

  static Future<void> saveSession(String token, Map<String, dynamic> user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_userKey, jsonEncode(user));
  }

  static Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  static Future<Map<String, dynamic>?> getUser() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_userKey);
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }

  static Future<Map<String, dynamic>> _handle(http.Response response) async {
    Map<String, dynamic> body;
    try {
      body = jsonDecode(response.body) as Map<String, dynamic>;
    } catch (_) {
      body = {};
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    }

    throw ApiException(
      response.statusCode,
      body["message"]?.toString() ?? "Something went wrong",
    );
  }

  static Future<Map<String, String>> _headers({bool auth = true}) async {
    final headers = {"Content-Type": "application/json"};
    if (auth) {
      final token = await getToken();
      if (token != null) headers["Authorization"] = "Bearer $token";
    }
    return headers;
  }

  static Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(
      Uri.parse("${AppConfig.baseUrl}$path"),
      headers: await _headers(),
    );
    return _handle(response);
  }

  static Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool auth = true,
  }) async {
    final response = await http.post(
      Uri.parse("${AppConfig.baseUrl}$path"),
      headers: await _headers(auth: auth),
      body: jsonEncode(body),
    );
    return _handle(response);
  }

  static Future<Map<String, dynamic>> put(
    String path, [
    Map<String, dynamic> body = const {},
  ]) async {
    final response = await http.put(
      Uri.parse("${AppConfig.baseUrl}$path"),
      headers: await _headers(),
      body: jsonEncode(body),
    );
    return _handle(response);
  }
}