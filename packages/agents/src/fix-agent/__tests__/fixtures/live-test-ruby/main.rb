# Live Test Ruby File for Tier 2 Native Fixer Validation
#
# This file contains INTENTIONAL issues that should be fixed by various tiers:
#
# Tier 1/2 (rubocop --auto-correct):
# - Style/StringLiterals: Double quotes instead of single quotes
# - Style/TrailingCommaInArrayLiteral: Missing trailing commas
# - Style/TrailingCommaInHashLiteral: Missing trailing commas
# - Style/FrozenStringLiteralComment: Missing magic comment
# - Layout/SpaceAroundOperators: Missing spaces
# - Layout/SpaceInsideHashLiteralBraces: Inconsistent spacing
# - Layout/SpaceInsideArrayLiteralBrackets: Inconsistent spacing
# - Layout/IndentationWidth: Inconsistent indentation
# - Layout/EmptyLines: Extra blank lines
# - Layout/TrailingWhitespace: Trailing whitespace
# - Layout/EndOfLine: Line endings
#
# Tier 3 (AI Required - Metrics, Complexity):
# - Metrics/MethodLength: Method too long
# - Metrics/CyclomaticComplexity: Too complex
# - Metrics/AbcSize: Assignment/Branch/Condition too high
# - Style/Documentation: Missing class documentation
#
# DO NOT manually fix these issues - they are test fixtures.

# Tier 1 (Style/FrozenStringLiteralComment): Missing magic comment at top

# Tier 1 (Style/StringLiterals): Using double quotes instead of single
class BadlyFormattedClass
  # Tier 1 (Style/StringLiterals): Double quotes where single would suffice
  def greeting_message
    "Hello, World!"
  end

  # Tier 1 (Style/StringLiterals): More double quotes
  def farewell_message
    "Goodbye, World!"
  end

  # Tier 1 (Layout/SpaceAroundOperators): Missing spaces around operators
  def calculate_sum(a,b,c)
    result=a+b*c-1
    result
  end

  # Tier 1 (Layout/SpaceInsideHashLiteralBraces): Bad hash spacing
  def create_config
    {:name=>"test",:value=>42,:enabled=>true}
  end

  # Tier 1 (Layout/SpaceInsideArrayLiteralBrackets): Bad array spacing
  def create_list
    [ "apple","banana","cherry" ]
  end

  # Tier 1 (Style/TrailingCommaInArrayLiteral): Missing trailing commas
  def multi_line_array
    [
      "first_item",
      "second_item",
      "third_item"
    ]
  end

  # Tier 1 (Style/TrailingCommaInHashLiteral): Missing trailing commas
  def multi_line_hash
    {
      name: "test",
      value: 123,
      active: true
    }
  end

  # Tier 1 (Layout/IndentationWidth): Bad indentation (3 spaces instead of 2)
  def bad_indentation
   result = 1
      nested = 2
    result + nested
  end

  # Tier 1 (Style/SymbolProc): Block can be replaced with symbol
  def process_names(names)
    names.map { |name| name.upcase }
  end

  # Tier 1 (Style/SymbolProc): Another block replacement opportunity
  def process_numbers(numbers)
    numbers.select { |n| n.even? }
  end

  # Tier 1 (Layout/EmptyLines): Extra blank lines


  def extra_blank_lines_above
    "method with blank lines above"
  end


  # Tier 1 (Style/RedundantReturn): Explicit return not needed
  def redundant_return_example(x)
    return x * 2
  end

  # Tier 1 (Style/RedundantSelf): Unnecessary self
  def self_reference_example
    self.class.name
  end

  # Tier 1 (Style/NegatedIf): Negated condition
  def negated_condition(value)
    if !value.nil?
      "has value"
    else
      "no value"
    end
  end

  # Tier 1 (Style/GuardClause): Could use guard clause
  def no_guard_clause(value)
    if value
      process(value)
      validate(value)
      save(value)
    end
  end

  # Tier 1 (Style/ConditionalAssignment): Can be simplified
  def conditional_assignment(condition)
    if condition
      result = "yes"
    else
      result = "no"
    end
    result
  end

  # Tier 1 (Style/IfUnlessModifier): Should use modifier form
  def modifier_form_candidate(x)
    if x > 10
      puts x
    end
  end

  # Tier 1 (Style/HashSyntax): Old hash rocket syntax
  def old_hash_syntax
    {:key => "value", :another => "data"}
  end

  # Tier 1 (Style/WordArray): Should use %w()
  def string_array_literal
    ["foo", "bar", "baz", "qux"]
  end

  # Tier 1 (Style/SymbolArray): Should use %i()
  def symbol_array_literal
    [:one, :two, :three, :four]
  end

  # Tier 3 (Metrics/MethodLength): Method too long - requires AI to refactor
  def overly_long_method(data)
    # This method intentionally has too many lines
    result = {}
    result[:step1] = data[:input1] || "default1"
    result[:step2] = data[:input2] || "default2"
    result[:step3] = data[:input3] || "default3"
    result[:step4] = data[:input4] || "default4"
    result[:step5] = data[:input5] || "default5"
    result[:step6] = data[:input6] || "default6"
    result[:step7] = data[:input7] || "default7"
    result[:step8] = data[:input8] || "default8"
    result[:step9] = data[:input9] || "default9"
    result[:step10] = data[:input10] || "default10"
    result[:step11] = data[:input11] || "default11"
    result[:step12] = data[:input12] || "default12"
    result[:step13] = data[:input13] || "default13"
    result[:step14] = data[:input14] || "default14"
    result[:step15] = data[:input15] || "default15"
    result[:processed] = true
    result[:timestamp] = Time.now
    result
  end

  # Tier 3 (Metrics/CyclomaticComplexity): Too many branches - requires AI
  def complex_decision_logic(a, b, c, d, e)
    if a > 0
      if b > 0
        if c > 0
          "all positive"
        elsif c < 0
          "c negative"
        else
          "c zero"
        end
      elsif b < 0
        if d > 0
          "d positive"
        else
          "d not positive"
        end
      else
        if e > 0
          "e positive"
        elsif e < 0
          "e negative"
        else
          "e zero"
        end
      end
    else
      "a not positive"
    end
  end

  # Tier 3 (Metrics/AbcSize): High ABC score - requires AI to refactor
  def high_abc_method(user)
    name = user.name
    email = user.email
    age = user.age
    address = user.address
    phone = user.phone
    company = user.company
    validated = validate_user(name, email)
    processed = process_user(age, address)
    notified = notify_user(phone, company)
    result = combine_results(validated, processed, notified)
    log_action(result)
    send_confirmation(email, result)
    update_database(user, result)
    result
  end

  private

  # Helper methods for the complex methods above
  def process(value)
    value
  end

  def validate(value)
    value
  end

  def save(value)
    value
  end

  def validate_user(name, email)
    true
  end

  def process_user(age, address)
    true
  end

  def notify_user(phone, company)
    true
  end

  def combine_results(a, b, c)
    { a: a, b: b, c: c }
  end

  def log_action(result)
    result
  end

  def send_confirmation(email, result)
    result
  end

  def update_database(user, result)
    result
  end
end

# Tier 1 (Style/Documentation): Missing class documentation
class UndocumentedClass
  def undocumented_method
    "no docs"
  end
end

# Tier 1 (Layout/TrailingWhitespace): Trailing whitespace below
# (There is intentional trailing whitespace on the line above)

# Usage example (avoids "unused class" warnings)
if __FILE__ == $PROGRAM_NAME
  obj = BadlyFormattedClass.new
  puts obj.greeting_message
  puts obj.farewell_message
  puts obj.calculate_sum(1, 2, 3)
  puts obj.create_config
  puts obj.create_list.inspect
  puts obj.multi_line_array.inspect
  puts obj.multi_line_hash
  puts obj.bad_indentation
  puts obj.process_names(["alice", "bob"])
  puts obj.process_numbers([1, 2, 3, 4, 5, 6])
  puts obj.extra_blank_lines_above
  puts obj.redundant_return_example(5)
  puts obj.self_reference_example
  puts obj.negated_condition("test")
  puts obj.conditional_assignment(true)
  puts obj.modifier_form_candidate(20)
  puts obj.old_hash_syntax
  puts obj.string_array_literal.inspect
  puts obj.symbol_array_literal.inspect
  puts obj.overly_long_method({})
  puts obj.complex_decision_logic(1, 1, 1, 1, 1)

  undoc = UndocumentedClass.new
  puts undoc.undocumented_method
end
