package ro.bid4.backend;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

/**
 * Rules the compiler cannot express, checked as a test.
 *
 * <p>Structure decays one reasonable shortcut at a time. These fail the build on the first one,
 * which is cheaper than noticing a year later that everything talks to everything.
 *
 * <p>Every pattern names {@code ro.bid4.backend} explicitly. A loose {@code ..domain..} also
 * matches {@code org.springframework.data.domain}, and a rule that fires on someone else's package
 * teaches people to ignore it.
 */
@AnalyzeClasses(packages = "ro.bid4.backend", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

  /** Feature packages, present and planned. Adding a feature means adding it here. */
  private static final String[] FEATURES = {
    "ro.bid4.backend.identity..",
    "ro.bid4.backend.cause..",
    "ro.bid4.backend.catalog..",
    // "order.." for a package called "orders" matched nothing, so the rule
    // below never covered the largest feature in the application.
    "ro.bid4.backend.orders..",
    "ro.bid4.backend.inbox..",
    "ro.bid4.backend.ledger..",
    "ro.bid4.backend.shipping..",
    "ro.bid4.backend.payments..",
    "ro.bid4.backend.billing..",
    "ro.bid4.backend.storage.."
  };

  @ArchTest
  static final ArchRule controllersDoNotTouchTheDatabase =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend..api..")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("ro.bid4.backend..repo..")
          .because("a controller that queries directly is a service nobody can reuse or test");

  @ArchTest
  static final ArchRule commonKnowsNothingOfFeatures =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend.common..")
          .should()
          .dependOnClassesThat()
          .resideInAnyPackage(FEATURES)
          .because("common is the shared floor and must not know what is built on it");

  @ArchTest
  static final ArchRule repositoriesAreInterfaces =
      classes()
          .that()
          .resideInAPackage("ro.bid4.backend..repo..")
          .should()
          .beInterfaces()
          .because("Spring Data writes the implementation; a class here is a mistake");

  /**
   * The rule that matters most for the API contract: an entity reaching a controller signature
   * means the wire format becomes whatever the table happens to hold, password hash included.
   */
  @ArchTest
  static final ArchRule entitiesDoNotReachControllers =
      noClasses()
          .that()
          .resideInAPackage("ro.bid4.backend..api")
          .should()
          .dependOnClassesThat()
          .resideInAPackage("ro.bid4.backend..domain")
          .because("controllers speak DTOs, so no request can bind onto a table row");

  @ArchTest
  static final ArchRule noFieldInjection =
      noClasses()
          .should()
          .beAnnotatedWith("org.springframework.beans.factory.annotation.Autowired")
          .because("constructor injection makes a missing dependency a compile error");
}
