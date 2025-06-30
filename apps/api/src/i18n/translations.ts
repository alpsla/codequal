// Pre-defined translations for common API messages
// This helps with performance by avoiding real-time translation of common phrases

export const translations = {
  en: {
    errors: {
      unauthorized: 'Authentication required',
      forbidden: 'Access denied',
      not_found: 'Resource not found',
      rate_limit: 'Rate limit exceeded',
      invalid_request: 'Invalid request parameters',
      server_error: 'Internal server error',
      invalid_api_key: 'Invalid or expired API key',
      missing_api_key: 'API key required',
      invalid_pr_url: 'Invalid pull request URL',
      analysis_failed: 'Analysis failed',
      analysis_not_found: 'Analysis not found',
      repository_access_denied: 'Access denied to repository'
    },
    success: {
      created: 'Resource created successfully',
      updated: 'Resource updated successfully',
      deleted: 'Resource deleted successfully',
      analysis_started: 'Analysis started',
      analysis_complete: 'Analysis complete',
      api_key_created: 'API key created successfully',
      api_key_revoked: 'API key revoked successfully'
    },
    analysis: {
      queued: 'Analysis queued',
      processing: 'Analysis in progress',
      complete: 'Analysis complete',
      failed: 'Analysis failed'
    }
  },
  es: {
    errors: {
      unauthorized: 'Autenticación requerida',
      forbidden: 'Acceso denegado',
      not_found: 'Recurso no encontrado',
      rate_limit: 'Límite de velocidad excedido',
      invalid_request: 'Parámetros de solicitud inválidos',
      server_error: 'Error interno del servidor',
      invalid_api_key: 'Clave API inválida o expirada',
      missing_api_key: 'Se requiere clave API',
      invalid_pr_url: 'URL de pull request inválida',
      analysis_failed: 'Análisis fallido',
      analysis_not_found: 'Análisis no encontrado',
      repository_access_denied: 'Acceso denegado al repositorio'
    },
    success: {
      created: 'Recurso creado exitosamente',
      updated: 'Recurso actualizado exitosamente',
      deleted: 'Recurso eliminado exitosamente',
      analysis_started: 'Análisis iniciado',
      analysis_complete: 'Análisis completado',
      api_key_created: 'Clave API creada exitosamente',
      api_key_revoked: 'Clave API revocada exitosamente'
    },
    analysis: {
      queued: 'Análisis en cola',
      processing: 'Análisis en progreso',
      complete: 'Análisis completado',
      failed: 'Análisis fallido'
    }
  },
  zh: {
    errors: {
      unauthorized: '需要身份验证',
      forbidden: '访问被拒绝',
      not_found: '资源未找到',
      rate_limit: '超出速率限制',
      invalid_request: '无效的请求参数',
      server_error: '内部服务器错误',
      invalid_api_key: '无效或过期的API密钥',
      missing_api_key: '需要API密钥',
      invalid_pr_url: '无效的拉取请求URL',
      analysis_failed: '分析失败',
      analysis_not_found: '未找到分析',
      repository_access_denied: '存储库访问被拒绝'
    },
    success: {
      created: '资源创建成功',
      updated: '资源更新成功',
      deleted: '资源删除成功',
      analysis_started: '分析已开始',
      analysis_complete: '分析完成',
      api_key_created: 'API密钥创建成功',
      api_key_revoked: 'API密钥撤销成功'
    },
    analysis: {
      queued: '分析排队中',
      processing: '分析进行中',
      complete: '分析完成',
      failed: '分析失败'
    }
  },
  hi: {
    errors: {
      unauthorized: 'प्रमाणीकरण आवश्यक',
      forbidden: 'पहुंच निषेध',
      not_found: 'संसाधन नहीं मिला',
      rate_limit: 'दर सीमा पार हो गई',
      invalid_request: 'अमान्य अनुरोध पैरामीटर',
      server_error: 'आंतरिक सर्वर त्रुटि',
      invalid_api_key: 'अमान्य या समाप्त API कुंजी',
      missing_api_key: 'API कुंजी आवश्यक',
      invalid_pr_url: 'अमान्य पुल अनुरोध URL',
      analysis_failed: 'विश्लेषण विफल',
      analysis_not_found: 'विश्लेषण नहीं मिला',
      repository_access_denied: 'रिपॉजिटरी तक पहुंच निषेध'
    },
    success: {
      created: 'संसाधन सफलतापूर्वक बनाया गया',
      updated: 'संसाधन सफलतापूर्वक अपडेट किया गया',
      deleted: 'संसाधन सफलतापूर्वक हटाया गया',
      analysis_started: 'विश्लेषण शुरू हुआ',
      analysis_complete: 'विश्लेषण पूर्ण',
      api_key_created: 'API कुंजी सफलतापूर्वक बनाई गई',
      api_key_revoked: 'API कुंजी सफलतापूर्वक रद्द की गई'
    },
    analysis: {
      queued: 'विश्लेषण कतार में',
      processing: 'विश्लेषण जारी है',
      complete: 'विश्लेषण पूर्ण',
      failed: 'विश्लेषण विफल'
    }
  },
  pt: {
    errors: {
      unauthorized: 'Autenticação necessária',
      forbidden: 'Acesso negado',
      not_found: 'Recurso não encontrado',
      rate_limit: 'Limite de taxa excedido',
      invalid_request: 'Parâmetros de solicitação inválidos',
      server_error: 'Erro interno do servidor',
      invalid_api_key: 'Chave API inválida ou expirada',
      missing_api_key: 'Chave API necessária',
      invalid_pr_url: 'URL de pull request inválida',
      analysis_failed: 'Análise falhou',
      analysis_not_found: 'Análise não encontrada',
      repository_access_denied: 'Acesso negado ao repositório'
    },
    success: {
      created: 'Recurso criado com sucesso',
      updated: 'Recurso atualizado com sucesso',
      deleted: 'Recurso excluído com sucesso',
      analysis_started: 'Análise iniciada',
      analysis_complete: 'Análise concluída',
      api_key_created: 'Chave API criada com sucesso',
      api_key_revoked: 'Chave API revogada com sucesso'
    },
    analysis: {
      queued: 'Análise na fila',
      processing: 'Análise em andamento',
      complete: 'Análise concluída',
      failed: 'Análise falhou'
    }
  },
  ja: {
    errors: {
      unauthorized: '認証が必要です',
      forbidden: 'アクセスが拒否されました',
      not_found: 'リソースが見つかりません',
      rate_limit: 'レート制限を超えました',
      invalid_request: '無効なリクエストパラメータ',
      server_error: '内部サーバーエラー',
      invalid_api_key: '無効または期限切れのAPIキー',
      missing_api_key: 'APIキーが必要です',
      invalid_pr_url: '無効なプルリクエストURL',
      analysis_failed: '分析に失敗しました',
      analysis_not_found: '分析が見つかりません',
      repository_access_denied: 'リポジトリへのアクセスが拒否されました'
    },
    success: {
      created: 'リソースが正常に作成されました',
      updated: 'リソースが正常に更新されました',
      deleted: 'リソースが正常に削除されました',
      analysis_started: '分析を開始しました',
      analysis_complete: '分析が完了しました',
      api_key_created: 'APIキーが正常に作成されました',
      api_key_revoked: 'APIキーが正常に取り消されました'
    },
    analysis: {
      queued: '分析待機中',
      processing: '分析中',
      complete: '分析完了',
      failed: '分析失敗'
    }
  },
  de: {
    errors: {
      unauthorized: 'Authentifizierung erforderlich',
      forbidden: 'Zugriff verweigert',
      not_found: 'Ressource nicht gefunden',
      rate_limit: 'Ratenlimit überschritten',
      invalid_request: 'Ungültige Anfrageparameter',
      server_error: 'Interner Serverfehler',
      invalid_api_key: 'Ungültiger oder abgelaufener API-Schlüssel',
      missing_api_key: 'API-Schlüssel erforderlich',
      invalid_pr_url: 'Ungültige Pull-Request-URL',
      analysis_failed: 'Analyse fehlgeschlagen',
      analysis_not_found: 'Analyse nicht gefunden',
      repository_access_denied: 'Zugriff auf Repository verweigert'
    },
    success: {
      created: 'Ressource erfolgreich erstellt',
      updated: 'Ressource erfolgreich aktualisiert',
      deleted: 'Ressource erfolgreich gelöscht',
      analysis_started: 'Analyse gestartet',
      analysis_complete: 'Analyse abgeschlossen',
      api_key_created: 'API-Schlüssel erfolgreich erstellt',
      api_key_revoked: 'API-Schlüssel erfolgreich widerrufen'
    },
    analysis: {
      queued: 'Analyse in Warteschlange',
      processing: 'Analyse läuft',
      complete: 'Analyse abgeschlossen',
      failed: 'Analyse fehlgeschlagen'
    }
  },
  ru: {
    errors: {
      unauthorized: 'Требуется аутентификация',
      forbidden: 'Доступ запрещен',
      not_found: 'Ресурс не найден',
      rate_limit: 'Превышен лимит скорости',
      invalid_request: 'Недопустимые параметры запроса',
      server_error: 'Внутренняя ошибка сервера',
      invalid_api_key: 'Недействительный или истекший API-ключ',
      missing_api_key: 'Требуется API-ключ',
      invalid_pr_url: 'Недопустимый URL запроса на слияние',
      analysis_failed: 'Анализ не удался',
      analysis_not_found: 'Анализ не найден',
      repository_access_denied: 'Доступ к репозиторию запрещен'
    },
    success: {
      created: 'Ресурс успешно создан',
      updated: 'Ресурс успешно обновлен',
      deleted: 'Ресурс успешно удален',
      analysis_started: 'Анализ начат',
      analysis_complete: 'Анализ завершен',
      api_key_created: 'API-ключ успешно создан',
      api_key_revoked: 'API-ключ успешно отозван'
    },
    analysis: {
      queued: 'Анализ в очереди',
      processing: 'Анализ выполняется',
      complete: 'Анализ завершен',
      failed: 'Анализ не удался'
    }
  },
  fr: {
    errors: {
      unauthorized: 'Authentification requise',
      forbidden: 'Accès refusé',
      not_found: 'Ressource non trouvée',
      rate_limit: 'Limite de taux dépassée',
      invalid_request: 'Paramètres de requête invalides',
      server_error: 'Erreur interne du serveur',
      invalid_api_key: 'Clé API invalide ou expirée',
      missing_api_key: 'Clé API requise',
      invalid_pr_url: 'URL de pull request invalide',
      analysis_failed: 'Échec de l\'analyse',
      analysis_not_found: 'Analyse non trouvée',
      repository_access_denied: 'Accès au dépôt refusé'
    },
    success: {
      created: 'Ressource créée avec succès',
      updated: 'Ressource mise à jour avec succès',
      deleted: 'Ressource supprimée avec succès',
      analysis_started: 'Analyse commencée',
      analysis_complete: 'Analyse terminée',
      api_key_created: 'Clé API créée avec succès',
      api_key_revoked: 'Clé API révoquée avec succès'
    },
    analysis: {
      queued: 'Analyse en file d\'attente',
      processing: 'Analyse en cours',
      complete: 'Analyse terminée',
      failed: 'Échec de l\'analyse'
    }
  },
  ko: {
    errors: {
      unauthorized: '인증이 필요합니다',
      forbidden: '접근이 거부되었습니다',
      not_found: '리소스를 찾을 수 없습니다',
      rate_limit: '속도 제한을 초과했습니다',
      invalid_request: '잘못된 요청 매개변수',
      server_error: '내부 서버 오류',
      invalid_api_key: '유효하지 않거나 만료된 API 키',
      missing_api_key: 'API 키가 필요합니다',
      invalid_pr_url: '잘못된 풀 리퀘스트 URL',
      analysis_failed: '분석 실패',
      analysis_not_found: '분석을 찾을 수 없습니다',
      repository_access_denied: '저장소 접근이 거부되었습니다'
    },
    success: {
      created: '리소스가 성공적으로 생성되었습니다',
      updated: '리소스가 성공적으로 업데이트되었습니다',
      deleted: '리소스가 성공적으로 삭제되었습니다',
      analysis_started: '분석이 시작되었습니다',
      analysis_complete: '분석이 완료되었습니다',
      api_key_created: 'API 키가 성공적으로 생성되었습니다',
      api_key_revoked: 'API 키가 성공적으로 취소되었습니다'
    },
    analysis: {
      queued: '분석 대기 중',
      processing: '분석 진행 중',
      complete: '분석 완료',
      failed: '분석 실패'
    }
  }
};