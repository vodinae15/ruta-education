-- Function to create default 9 modules for a new course
CREATE OR REPLACE FUNCTION create_default_modules(course_uuid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO course_modules (course_id, module_number, title, description, order_index) VALUES
    (course_uuid, 1, 'Приветствие и ввод', 'Знакомство с курсом и целями', 1),
    (course_uuid, 2, 'Ориентир/Навигация', 'Как работать с материалом', 2),
    (course_uuid, 3, 'Основной урок 1', 'Первая ключевая тема', 3),
    (course_uuid, 4, 'Промежуточная практика', 'Закрепление знаний', 4),
    (course_uuid, 5, 'Основной урок 2', 'Развитие темы', 5),
    (course_uuid, 6, 'Промежуточный тест', 'Проверка понимания', 6),
    (course_uuid, 7, 'Основной урок 3', 'Практическое применение', 7),
    (course_uuid, 8, 'Итог и завершение', 'Выводы и дальнейшие шаги', 8),
    (course_uuid, 9, 'Бонус/поддержка', 'Дополнительные материалы', 9);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create modules when a course is created
CREATE OR REPLACE FUNCTION trigger_create_default_modules()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_default_modules(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_course_insert
  AFTER INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_default_modules();
